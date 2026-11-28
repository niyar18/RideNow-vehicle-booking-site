/**
 * RideNow Core Safety Engine (Phase 10)
 *
 * Implements:
 * 1. Independent immutable safety incident logging (SafetyIncident)
 * 2. In-app Emergency SOS incident recording with best-effort app updates
 * 3. Automated ride anomaly telemetry checks (unexpected stops, route deviations, GPS signal drops)
 * 4. Masked contact privacy & secure trip sharing
 * 5. Incident lifecycle resolution (active -> investigating -> resolved / false_alarm)
 */
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import SafetyIncident, {
  ISafetyIncident,
  IncidentType,
  IncidentSeverity,
} from "@/models/safetyIncident.model";
import { haversineDistance } from "@/lib/routeUtils";
import { sendPushToUser } from "@/lib/webPush";
import { emitSocketEvent } from "@/lib/socketServerEmit";
import { Types } from "mongoose";
import crypto from "crypto";

export function generateIncidentId(prefix = "INC"): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}_${timestamp}_${random}`;
}

export interface TriggerSosParams {
  bookingId: string | Types.ObjectId;
  reporterId: string | Types.ObjectId;
  reporterRole: "user" | "driver" | "system" | "admin";
  coordinates?: [number, number]; // [lng, lat]
  reason?: string;
}

export interface TelemetryCheckParams {
  bookingId: string | Types.ObjectId;
  currentCoordinates?: [number, number]; // [lng, lat]
  lastUpdateTimestamp?: Date | number;
  isStationary?: boolean;
  stationaryDurationMinutes?: number;
}

export interface SafetyReportParams {
  bookingId: string | Types.ObjectId;
  reporterId: string | Types.ObjectId;
  reporterRole: "user" | "driver" | "admin";
  type: IncidentType;
  severity?: IncidentSeverity;
  description: string;
  coordinates?: [number, number];
}

/**
 * Records an in-app SOS incident. No external emergency dispatch or contact messaging.
 */
export async function triggerEmergencySos(params: TriggerSosParams) {
  await connectDb();
  const { bookingId, reporterId, reporterRole, coordinates, reason } = params;

  const booking = await Booking.findById(bookingId).populate("driver user");
  if (!booking) {
    throw new Error("Ride booking not found");
  }

  const now = new Date();
  const incidentId = generateIncidentId("INC_SOS");

  // 1. Activate Panic State on Booking
  booking.isPanicActive = true;
  booking.panicActivatedAt = now;
  booking.safetyStatus = "sos_activated";
  booking.safetyNotes = reason || `Emergency SOS triggered by ${reporterRole} at ${now.toLocaleTimeString()}`;
  await booking.save();

  // 2. Record the incident without claiming any external delivery.
  const incident = await SafetyIncident.create({
    incidentId,
    booking: booking._id,
    reporter: reporterId,
    reporterRole,
    type: "sos_panic",
    severity: "critical",
    status: "active",
    description: reason || "Emergency SOS Panic button pressed",
    location: coordinates
      ? {
          type: "Point",
          coordinates,
          address: booking.pickupAddress,
        }
      : undefined,
    emergencyContactsNotified: false,
    notifiedContactsCount: 0,
  });

  const shareUrl = booking.shareToken
    ? `${process.env.NEXT_PUBLIC_APP_URL || ""}/track/${booking.shareToken}`
    : undefined;

  // 3. Broadcast Real-time WebSocket Events
  const socketServer = process.env.NEXT_PUBLIC_SOCKET_SERVER;
  if (socketServer) {
    const payload = {
      incidentId,
      bookingId: booking._id.toString(),
      isPanicActive: true,
      panicActivatedAt: now,
      safetyStatus: "sos_activated",
      reporterRole,
      shareUrl,
      coordinates,
    };

    try {
      if (booking.user) {
        await emitSocketEvent({
          userId: (booking.user._id || booking.user).toString(),
          event: "safety-panic-alert",
          data: payload,
        });
      }

      if (booking.driver) {
        await emitSocketEvent({
          userId: (booking.driver._id || booking.driver).toString(),
          event: "safety-panic-alert",
          data: payload,
        });
      }
    } catch (wsErr) {
      console.warn("WebSocket panic emit failed:", wsErr);
    }
  }

  // 4. Send Web Push alerts
  try {
    if (booking.user) {
      await sendPushToUser((booking.user._id || booking.user).toString(), {
        title: "SOS recorded in Jaatri",
        body: "Jaatri did not contact emergency services or your emergency contacts. For immediate help, call 112 directly.",
        url: `/ride/${booking._id}`,
        tag: `sos-${booking._id}`,
      });
    }
  } catch (pushErr) {
    console.warn("Web Push panic alert failed:", pushErr);
  }

  return {
    success: true,
    incidentId,
    incident,
    shareUrl,
  };
}

/**
 * Evaluates real-time telemetry for unexpected stops, route deviations, and GPS signal loss.
 */
export async function evaluateRideSafetyTelemetry(params: TelemetryCheckParams) {
  await connectDb();
  const { bookingId, currentCoordinates, lastUpdateTimestamp, isStationary, stationaryDurationMinutes } = params;

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return { hasAnomaly: false, message: "Booking not found" };
  }

  // Only monitor actively in-flight rides
  if (!["started", "ride_started", "ride_in_progress"].includes(booking.status)) {
    return { hasAnomaly: false, message: "Ride is not currently in progress" };
  }

  const now = Date.now();
  const anomalies: Array<{ type: IncidentType; message: string; severity: IncidentSeverity }> = [];

  // 1. Check Unexpected Stationary Stop (> 5 minutes stationary mid-trip)
  if (isStationary && typeof stationaryDurationMinutes === "number" && stationaryDurationMinutes >= 5) {
    anomalies.push({
      type: "unexpected_stop",
      severity: "medium",
      message: `Vehicle has been stationary for ${Math.round(stationaryDurationMinutes)} minutes mid-trip.`,
    });
  }

  // 2. Check GPS Heartbeat & Signal Loss (> 3 minutes without location update)
  if (lastUpdateTimestamp) {
    const elapsedMinutes = (now - new Date(lastUpdateTimestamp).getTime()) / (60 * 1000);
    if (elapsedMinutes >= 3) {
      anomalies.push({
        type: "gps_signal_lost",
        severity: "medium",
        message: `GPS telemetry lost. No signal received for ${Math.round(elapsedMinutes)} minutes.`,
      });
    }
  }

  // 3. Check Route Deviation if coordinates provided
  if (currentCoordinates && booking.pickupLocation?.coordinates && booking.dropLocation?.coordinates) {
    const [currLng, currLat] = currentCoordinates;
    const [pLng, pLat] = booking.pickupLocation.coordinates;
    const [dLng, dLat] = booking.dropLocation.coordinates;

    const distToPickup = haversineDistance([pLng, pLat], [currLng, currLat]);
    const distToDrop = haversineDistance([dLng, dLat], [currLng, currLat]);
    const directTotal = haversineDistance([pLng, pLat], [dLng, dLat]);

    // Triangle inequality off-route corridor heuristic: if (distToPickup + distToDrop) exceeds direct route by > 3 km
    if (directTotal > 0 && distToPickup + distToDrop > directTotal + 3.0) {
      anomalies.push({
        type: "route_deviation",
        severity: "high",
        message: "Vehicle location deviates significantly from the standard route corridor.",
      });
    }
  }

  if (anomalies.length > 0) {
    const primary = anomalies[0];
    booking.safetyStatus = "deviation_detected";
    booking.isRouteDeviated = true;
    await booking.save();

    return {
      hasAnomaly: true,
      anomalies,
      primaryAnomaly: primary,
      requiresCheckin: true,
    };
  }

  return { hasAnomaly: false, message: "Telemetry normal" };
}

/**
 * Files an independent, audited safety report (post-trip or mid-trip).
 */
export async function submitSafetyReport(params: SafetyReportParams): Promise<ISafetyIncident> {
  await connectDb();
  const { bookingId, reporterId, reporterRole, type, severity = "medium", description, coordinates } = params;

  const incidentId = generateIncidentId("INC_REP");

  const incident = await SafetyIncident.create({
    incidentId,
    booking: bookingId,
    reporter: reporterId,
    reporterRole,
    type,
    severity,
    status: "active",
    description,
    location: coordinates
      ? {
          type: "Point",
          coordinates,
        }
      : undefined,
    emergencyContactsNotified: false,
    notifiedContactsCount: 0,
  });

  return incident;
}

/**
 * Resolves a safety incident with admin justification notes.
 */
export async function resolveSafetyIncident(params: {
  incidentId: string;
  adminId: string | Types.ObjectId;
  resolutionStatus: "resolved" | "false_alarm";
  resolutionNotes: string;
}) {
  await connectDb();
  const { incidentId, adminId, resolutionStatus, resolutionNotes } = params;

  const incident = await SafetyIncident.findOne({ incidentId });
  if (!incident) {
    throw new Error("Safety incident not found");
  }

  incident.status = resolutionStatus;
  incident.resolutionNotes = resolutionNotes;
  incident.resolvedBy = new Types.ObjectId(adminId.toString());
  incident.resolvedAt = new Date();
  await incident.save();

  // If this was an active panic on the booking, clear the panic flag
  const booking = await Booking.findById(incident.booking);
  if (booking && booking.isPanicActive) {
    booking.isPanicActive = false;
    booking.safetyStatus = "passenger_confirmed_safe";
    booking.safetyNotes = `Resolved: ${resolutionNotes}`;
    await booking.save();
  }

  return { success: true, incident };
}
