import express from "express"
import http from "http"
import dotenv from "dotenv"
import cors from "cors"
import helmet from "helmet"
import { Server } from "socket.io"
import crypto from "crypto"
import mongoose from "mongoose"

dotenv.config()

import User from "./models/user.models.js"

// ── Database Connection ──────────────────────────────────────────────────────
const mongoUri = process.env.MONGODB_URI || process.env.MONGODB_URL;
if (!mongoUri) {
  console.error("FATAL: MONGODB_URI or MONGODB_URL is missing in environment variables.");
  process.exit(1);
}

try {
  await mongoose.connect(mongoUri);
  console.log("Database connected successfully");
} catch (error) {
  console.error("Database connection error:", error.message || error);
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  } else {
    console.warn("[Database] Running in disconnected development/testing mode; database operations will wait or fail gracefully.");
  }
}

const app = express()
const server = http.createServer(app)
const port = Number(process.env.PORT) || 5000

// ── Shared Security Secrets ──────────────────────────────────────────────────
const INTERNAL_SECRET =
  process.env.SOCKET_INTERNAL_SECRET ||
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  process.env.JWT_SECRET;

if (!INTERNAL_SECRET) {
  console.error("FATAL: SOCKET_INTERNAL_SECRET or AUTH_SECRET is required to secure SocketServer.");
  process.exit(1);
}

// ── Multi-Origin CORS Handling ──────────────────────────────────────────────
const configuredOrigins = (process.env.NEXT_BASE_URL || "")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) return true; // Server-to-server or non-browser request
  if (configuredOrigins.length > 0 && configuredOrigins.includes(origin)) return true;
  // Localhost development environments
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  // Production and preview deployments on Vercel
  if (/^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(origin)) return true;
  return false;
};

const corsDelegate = (origin, callback) => {
  if (isOriginAllowed(origin)) {
    return callback(null, true);
  }
  return callback(new Error(`[SocketCORS] Blocked request from origin: ${origin}`));
};

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: corsDelegate, credentials: true }));
app.use(express.json({ limit: "1mb" }));

// ── Public Health & Diagnostic Endpoint ──────────────────────────────────────
app.get(["/", "/health"], (req, res) => {
  res.json({
    status: "ok",
    service: "RideNow Realtime Socket Gateway",
    uptimeSeconds: Math.floor(process.uptime()),
    connectedSockets: io.engine.clientsCount,
    timestamp: new Date().toISOString(),
  });
});

// ── Socket.IO Gateway Server ─────────────────────────────────────────────────
const io = new Server(server, {
  maxHttpBufferSize: 1e6, // 1MB payload ceiling prevents memory exhaustion attacks
  pingTimeout: 20000,
  pingInterval: 25000,
  transports: ["websocket", "polling"],
  cors: {
    origin: (origin, callback) => callback(null, isOriginAllowed(origin)),
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// A share link may show trip status after the ride, but it must never expose
// live driver location or retain a public socket subscription after termination.
const TERMINAL_BOOKING_STATUSES = new Set([
  "completed", "cancelled", "rejected", "expired", "payment_failed", "no_drivers_available", "disputed",
]);
const isTerminalBookingStatus = (status) =>
  TERMINAL_BOOKING_STATUSES.has(String(status || "").toLowerCase());

function isTrackingTokenExpired(booking) {
  const explicitExpiry = booking?.shareTokenExpiresAt ? new Date(booking.shareTokenExpiresAt).getTime() : NaN;
  if (Number.isFinite(explicitExpiry)) return explicitExpiry <= Date.now();

  // Backward-compatible expiry for records created before shareTokenExpiresAt existed.
  const scheduled = Boolean(booking?.isScheduled && booking?.scheduledPickupTime);
  const referenceTime = scheduled
    ? new Date(booking.scheduledPickupTime).getTime()
    : new Date(booking?.createdAt).getTime();
  if (!Number.isFinite(referenceTime)) return true;
  return referenceTime + (scheduled ? 12 : 24) * 60 * 60 * 1000 <= Date.now();
}

async function revokePublicTrackingObservers(bookingId) {
  if (!bookingId) return;
  const room = `booking-${bookingId}`;
  try {
    const roomSockets = await io.in(room).fetchSockets();
    await Promise.all(roomSockets.map(async (observer) => {
      const publicBookings = observer.data?.publicTrackingBookingIds;
      if (Array.isArray(publicBookings) && publicBookings.includes(String(bookingId))) {
        await observer.leave(room);
        observer.data.publicTrackingBookingIds = publicBookings.filter((id) => id !== String(bookingId));
      }
    }));
  } catch (error) {
    console.error(`[SocketSecurity] Failed to revoke public tracking observers for booking ${bookingId}:`, error);
  }
}

// ── Authoritative Internal Event Emission Endpoint ───────────────────────────
app.post("/emit", async (req, res) => {
  const secret = req.headers["x-socket-secret"] || req.headers["x-internal-secret"];
  if (!secret) {
    return res.status(401).json({ success: false, error: "Missing x-socket-secret header" });
  }

  const secretBuf = Buffer.from(String(secret), "utf8");
  const expectedBuf = Buffer.from(String(INTERNAL_SECRET), "utf8");
  if (secretBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(secretBuf, expectedBuf)) {
    return res.status(403).json({ success: false, error: "Unauthorized socket emission secret" });
  }

  const { userId, event, data, bookingId: directBookingId, room } = req.body;
  if (!event || typeof event !== "string") {
    return res.status(400).json({ success: false, error: "Missing or invalid event name" });
  }

  try {
    // 1. Emit to user room and socket ID if targeted at a specific user
    if (userId) {
      io.to(`user-${userId}`).emit(event, data);
      const user = await User.findById(userId).select("socketId").lean();
      if (user?.socketId) {
        io.to(user.socketId).emit(event, data);
      }
    }

    // 2. Broadcast to booking room if bookingId is present
    const bId = directBookingId || data?.bookingId || data?._id;
    if (bId) {
      io.to(`booking-${bId}`).emit(event, data);
    }

    // 3. Broadcast to custom room if requested
    if (room) {
      io.to(room).emit(event, data);
    }

    // Deliver the terminal status once, then revoke public live-tracking subscriptions.
    const emittedBookingId = directBookingId || data?.bookingId || data?._id;
    if (emittedBookingId && isTerminalBookingStatus(data?.status)) {
      await revokePublicTrackingObservers(String(emittedBookingId));
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Socket emit endpoint error:", error);
    res.status(500).json({ success: false, error: "Internal emission failure" });
  }
});

// ── Token Verification Helper ────────────────────────────────────────────────
function verifySocketToken(token) {
  if (!token || typeof token !== "string") return null;

  // Direct internal service secret token
  if (token === INTERNAL_SECRET) {
    return { isInternalAdmin: true, role: "admin" };
  }

  // HMAC-signed token: "payloadB64.signature"
  if (token.includes(".")) {
    const parts = token.split(".");
    if (parts.length === 2) {
      const [payloadB64, signature] = parts;
      const expectedSig = crypto
        .createHmac("sha256", INTERNAL_SECRET)
        .update(payloadB64)
        .digest("base64url");

      const sigBuf = Buffer.from(signature, "utf8");
      const expectedBuf = Buffer.from(expectedSig, "utf8");

      if (sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        try {
          const decoded = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
          if (decoded?.exp && Date.now() > decoded.exp) {
            console.warn(`[SocketAuth] Expired token for user: ${decoded?.userId}`);
            return null;
          }
          return decoded;
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

// ── Handshake Authentication Middleware ──────────────────────────────────────
io.use(async (socket, next) => {
  try {
    const authPayload = socket.handshake.auth || {};
    const token =
      authPayload.token ||
      socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "") ||
      socket.handshake.query?.token;

    const trackingToken = authPayload.trackingToken || socket.handshake.query?.trackingToken;
    if (trackingToken) {
      socket.trackingToken = String(trackingToken);
    }

    const verified = verifySocketToken(token);

    if (verified?.isInternalAdmin) {
      socket.isInternalAdmin = true;
      socket.userRole = "admin";
      return next();
    }

    if (verified?.userId) {
      if (!mongoose.Types.ObjectId.isValid(verified.userId)) {
        return next(new Error("Invalid user authentication credentials"));
      }

      const user = await User.findById(verified.userId).select("_id role isVendorBlocked isOnline");
      if (user) {
        if (user.isVendorBlocked) {
          return next(new Error("Vendor account is blocked"));
        }
        socket.userId = user._id.toString();
        socket.userRole = user.role || verified.role || "user";
        socket.data.userId = user._id.toString();
        socket.data.userRole = socket.userRole;
        return next();
      }
    }

    // Allow unauthenticated connection as guest (for public tracking or pre-login landing)
    socket.userId = null;
    socket.userRole = "guest";
    socket.data.userId = null;
    socket.data.userRole = "guest";
    next();
  } catch (err) {
    console.error("Socket authentication middleware error:", err);
    next();
  }
});

// ── Booking Participant Verification Helper ──────────────────────────────────
async function verifyBookingAccess(bookingId, userId, userRole, trackingToken) {
  if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) return { allowed: false };

  try {
    const booking = await mongoose.connection.collection("bookings").findOne(
      { _id: new mongoose.Types.ObjectId(bookingId) },
      { projection: { user: 1, driver: 1, candidateDrivers: 1, shareToken: 1, status: 1, shareTokenExpiresAt: 1, createdAt: 1, isScheduled: 1, scheduledPickupTime: 1 } }
    );

    if (!booking) return { allowed: false };

    // Public observer access requires the secret share token and an active trip.
    // The link can still show static status via the HTTP endpoint after termination,
    // but it cannot join the live room or receive any further GPS updates.
    if (trackingToken && booking.shareToken && String(trackingToken) === String(booking.shareToken)) {
      if (isTrackingTokenExpired(booking) || isTerminalBookingStatus(booking.status)) {
        return { allowed: false, reason: "tracking-expired-or-ended" };
      }
      return { allowed: true, isObserver: true };
    }

    if (!userId) return { allowed: false };

    const uidStr = userId.toString();
    const isRider = booking.user && booking.user.toString() === uidStr;
    const isDriver = booking.driver && booking.driver.toString() === uidStr;
    const isCandidate =
      Array.isArray(booking.candidateDrivers) &&
      booking.candidateDrivers.some((c) => c && c.toString() === uidStr);
    const isAdmin = userRole === "admin";

    if (isRider || isDriver || isCandidate || isAdmin) {
      return { allowed: true, isRider, isDriver, isCandidate, isAdmin };
    }

    return { allowed: false };
  } catch (err) {
    console.error("[verifyBookingAccess] error:", err);
    return { allowed: false };
  }
}

// ── In-Memory Socket Rate Limiter (Max 30 msgs/sec per socket) ────────────────
const socketMessageCounts = new Map(); // socketId -> { count, resetTime, lastGpsTime }

function checkSocketRateLimit(socketId, isGps = false) {
  const now = Date.now();
  let entry = socketMessageCounts.get(socketId);
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + 1000, lastGpsTime: 0 };
    socketMessageCounts.set(socketId, entry);
  }

  if (isGps) {
    if (now - entry.lastGpsTime < 600) {
      return false; // Throttled GPS: minimum 600ms between updates
    }
    entry.lastGpsTime = now;
  }

  entry.count += 1;
  return entry.count <= 35;
}

// ── Socket Event Dispatcher ──────────────────────────────────────────────────
io.on("connection", (socket) => {
  // Global socket-level rate-limiting middleware for all incoming client events
  socket.use(([event, ...args], next) => {
    const isGps = event === "driver-location-update" || event === "driver-live-location";
    if (!checkSocketRateLimit(socket.id, isGps)) {
      socket.emit("rate-limit-warning", {
        message: "Too many messages sent. Please slow down.",
        event,
      });
      return; // Drop excessive message
    }
    next();
  });

  // Auto-join user room if authenticated during handshake
  if (socket.userId) {
    socket.join(`user-${socket.userId}`);
    User.findByIdAndUpdate(socket.userId, { socketId: socket.id, lastHeartbeat: new Date() }).catch(() => {});
  }

  // Upgrade guest connection to authenticated socket after user signs in
  socket.on("authenticate", async (data) => {
    const token = data?.token;
    if (!token) return;

    const verified = verifySocketToken(token);
    if (!verified?.userId || !mongoose.Types.ObjectId.isValid(verified.userId)) {
      console.warn(`[SocketSecurity] Rejected invalid authenticate token from socket ${socket.id}`);
      return;
    }

    try {
      const user = await User.findById(verified.userId).select("_id role isVendorBlocked");
      if (!user || user.isVendorBlocked) return;

      socket.userId = user._id.toString();
      socket.userRole = user.role || verified.role || "user";
      socket.data.userId = user._id.toString();
      socket.data.userRole = socket.userRole;

      socket.join(`user-${socket.userId}`);
      await User.findByIdAndUpdate(socket.userId, { socketId: socket.id, lastHeartbeat: new Date() });
    } catch (err) {
      console.error("[SocketAuth] authenticate event error:", err);
    }
  });

  // Legacy identity heartbeat: only permitted if caller was already authenticated via token as that user
  socket.on("identity", async (userId) => {
    if (!userId || typeof userId !== "string" || !mongoose.Types.ObjectId.isValid(userId)) {
      return;
    }

    if (socket.userId && socket.userId !== userId) {
      console.warn(`[SocketSecurity] Socket ${socket.id} attempted identity mismatch: authenticated ${socket.userId} vs requested ${userId}`);
      return;
    }

    // Refresh presence if authenticated
    if (socket.userId === userId) {
      User.findByIdAndUpdate(userId, { socketId: socket.id, lastHeartbeat: new Date() }).catch(() => {});
    }
  });

  // Secure Room Joining: Enforces booking access verification
  socket.on("join-booking", async (payload) => {
    if (!checkSocketRateLimit(socket.id)) return;

    const bookingId = typeof payload === "string" ? payload : payload?.bookingId;
    const trackingToken = typeof payload === "object" ? payload?.trackingToken : socket.trackingToken;

    if (!bookingId || typeof bookingId !== "string" || !mongoose.Types.ObjectId.isValid(bookingId)) {
      return;
    }

    const auth = await verifyBookingAccess(bookingId, socket.userId, socket.userRole, trackingToken);
    if (!auth.allowed) {
      console.warn(`[SocketSecurity] Denied unauthorized join attempt for booking ${bookingId} by socket ${socket.id} (user: ${socket.userId || 'guest'})`);
      return;
    }

    socket.join(`booking-${bookingId}`);
    if (auth.isObserver) {
      const observed = Array.isArray(socket.data.publicTrackingBookingIds)
        ? socket.data.publicTrackingBookingIds
        : [];
      if (!observed.includes(bookingId)) observed.push(bookingId);
      socket.data.publicTrackingBookingIds = observed;
    }
  });

  // Leave Booking Room
  socket.on("leave-booking", (bookingId) => {
    if (bookingId && typeof bookingId === "string") {
      socket.leave(`booking-${bookingId}`);
      if (Array.isArray(socket.data.publicTrackingBookingIds)) {
        socket.data.publicTrackingBookingIds = socket.data.publicTrackingBookingIds.filter((id) => id !== bookingId);
      }
    }
  });

  // Real-time booking status relay between connected participants
  socket.on("booking-status-update", async (data) => {
    if (!checkSocketRateLimit(socket.id)) return;
    if (!data?.bookingId || !socket.userId) return;

    const auth = await verifyBookingAccess(data.bookingId, socket.userId, socket.userRole);
    if (auth.allowed && (auth.isRider || auth.isDriver || auth.isAdmin || socket.isInternalAdmin)) {
      io.to(`booking-${data.bookingId}`).emit("booking-updated", data);
      if (isTerminalBookingStatus(data.status)) {
        await revokePublicTrackingObservers(String(data.bookingId));
      }
    }
  });

  // Driver Live GPS Telemetry: Authenticated and strictly restricted to the assigned driver
  socket.on("driver-location-update", async (data) => {
    if (!checkSocketRateLimit(socket.id, true)) return;
    if (!socket.userId || !data?.bookingId || !mongoose.Types.ObjectId.isValid(data.bookingId)) return;

    const lat = Number(data.latitude);
    const lng = Number(data.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return;
    }

    try {
      const booking = await mongoose.connection.collection("bookings").findOne(
        { _id: new mongoose.Types.ObjectId(data.bookingId) },
        { projection: { driver: 1, status: 1 } }
      );

      if (!booking || booking.driver?.toString() !== socket.userId.toString()) {
        console.warn(`[SocketSecurity] Unauthorized location update for booking ${data.bookingId} by user ${socket.userId}`);
        return;
      }
      if (isTerminalBookingStatus(booking.status)) {
        await revokePublicTrackingObservers(String(data.bookingId));
        return;
      }

      // Relay coordinates to passenger and authorized tracking observers in the booking room
      io.to(`booking-${data.bookingId}`).emit("driver-location", {
        latitude: lat,
        longitude: lng,
        status: data.status || booking.status || "arriving",
      });
    } catch (err) {
      console.error("[SocketSecurity] driver-location-update error:", err);
    }
  });

  // In-Ride Chat Messaging: Authenticated booking participants only
  socket.on("chat-message", async (msg) => {
    if (!checkSocketRateLimit(socket.id)) return;
    if (!socket.userId) return;

    const bookingId = msg?.rideId || msg?.bookingId;
    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) return;

    const auth = await verifyBookingAccess(bookingId, socket.userId, socket.userRole);
    if (!auth.allowed || (!auth.isRider && !auth.isDriver && !auth.isAdmin)) {
      console.warn(`[SocketSecurity] Unauthorized chat message from user ${socket.userId} in booking ${bookingId}`);
      return;
    }

    io.to(`booking-${bookingId}`).emit("chat-message", msg);
  });

  // Call Signaling Authorization: Verified booking participants only
  socket.on("call-user", async (data) => {
    if (!checkSocketRateLimit(socket.id)) return;
    if (!socket.userId || !data?.bookingId) return;

    const auth = await verifyBookingAccess(data.bookingId, socket.userId, socket.userRole);
    if (auth.allowed && (auth.isRider || auth.isDriver)) {
      socket.to(`booking-${data.bookingId}`).emit("incoming-call", data);
    }
  });

  socket.on("accept-call", async (data) => {
    if (!checkSocketRateLimit(socket.id)) return;
    if (!socket.userId || !data?.bookingId) return;

    const auth = await verifyBookingAccess(data.bookingId, socket.userId, socket.userRole);
    if (auth.allowed && (auth.isRider || auth.isDriver)) {
      socket.to(`booking-${data.bookingId}`).emit("call-accepted", data);
    }
  });

  socket.on("reject-call", async (data) => {
    if (!checkSocketRateLimit(socket.id)) return;
    if (!socket.userId || !data?.bookingId) return;

    const auth = await verifyBookingAccess(data.bookingId, socket.userId, socket.userRole);
    if (auth.allowed && (auth.isRider || auth.isDriver)) {
      socket.to(`booking-${data.bookingId}`).emit("call-rejected", data);
    }
  });

  socket.on("end-call", async (data) => {
    if (!checkSocketRateLimit(socket.id)) return;
    if (!socket.userId || !data?.bookingId) return;

    const auth = await verifyBookingAccess(data.bookingId, socket.userId, socket.userRole);
    if (auth.allowed && (auth.isRider || auth.isDriver)) {
      socket.to(`booking-${data.bookingId}`).emit("call-ended", data);
    }
  });

  // Driver Idle Location Updates (Geospatial Point for Matching)
  socket.on("update-location", async (payload) => {
    if (!checkSocketRateLimit(socket.id, true)) return;
    if (!socket.userId) return;

    const lat = Number(payload?.latitude);
    const lng = Number(payload?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return;
    }

    try {
      await User.findByIdAndUpdate(socket.userId, {
        location: {
          type: "Point",
          coordinates: [lng, lat],
        },
        lastLocationUpdate: new Date(),
        lastHeartbeat: new Date(),
      });
    } catch (err) {
      console.error("update-location error:", err);
    }
  });

  // Graceful Disconnect & Presence Cleanup
  socket.on("disconnect", async () => {
    socketMessageCounts.delete(socket.id);
    if (!socket.userId) return;

    try {
      const user = await User.findById(socket.userId).select("role");
      const updateData = { socketId: null };
      if (user && user.role !== "vendor") {
        updateData.isOnline = false;
      }
      await User.findByIdAndUpdate(socket.userId, updateData);
    } catch (err) {
      console.error("Socket disconnect error:", err);
    }
  });
});

// ── Service Startup & Graceful Shutdown ──────────────────────────────────────
server.listen(port, () => {
  console.log(`RideNow Realtime Socket Gateway listening on port ${port}`);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  io.close(() => {
    mongoose.connection.close(false).then(() => {
      console.log("MongoDB connection closed. Exiting process.");
      process.exit(0);
    });
  });
});
