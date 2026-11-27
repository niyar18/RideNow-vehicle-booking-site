import { withoutRiderSecrets } from "@/lib/bookingPrivacy";
import { Types } from "mongoose";
import connectDb from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { emitSocketEvent } from "@/lib/socketServerEmit";
import { evaluateSafetyMatch, isDriverVerifiedWoman, DriverPreference, DriverPassengerPolicy } from "@/lib/safetyMatching";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import Wallet from "@/models/wallet.model";
import { transitionBookingState } from "@/lib/bookingStateMachine";
import { generateSecureOtp } from "@/lib/cryptoOtp";
import { MAX_ALLOWED_PLATFORM_DUES } from "@/lib/driverMatchingEngine";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  await connectDb();
  const session = await auth();
  const id = (await context.params).id;

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized: Driver login required" }, { status: 401 });
  }

  const userRole = session.user.role;
  if (userRole !== "vendor" && userRole !== "driver" && userRole !== "admin") {
    return NextResponse.json({ message: "Forbidden: Driver or Admin privileges required" }, { status: 403 });
  }

  const actorRole = userRole === "admin" ? "admin" : "driver";
  const actorId = session.user.id;

  const existingBooking = await Booking.findById(id).select("paymentStatus fare pickupOtp driver status candidateDrivers user driverPreference");
  if (!existingBooking) {
    return NextResponse.json({ message: "Booking not found" }, { status: 404 });
  }

  // 1. Idempotency Check: Driver retrying same acceptance request
  if (
    actorId &&
    existingBooking.driver &&
    existingBooking.driver.toString() === actorId.toString() &&
    ["driver_assigned", "awaiting_payment", "confirmed", "driver_arriving"].includes(existingBooking.status)
  ) {
    return NextResponse.json({
      success: true,
      message: "Booking already accepted by you.",
      booking: withoutRiderSecrets(existingBooking),
      isDuplicate: true,
    });
  }

  // 1.5. Candidate Driver Verification: Ensure this driver was offered/dispatched this ride
  if (actorRole === "driver" && actorId) {
    const candidates: string[] = (existingBooking.candidateDrivers || []).map((c: any) => c.toString());
    if (candidates.length > 0 && !candidates.includes(actorId.toString())) {
      return NextResponse.json(
        {
          message: "You are not an eligible candidate for this ride request.",
          errorCode: "NOT_A_CANDIDATE",
        },
        { status: 403 }
      );
    }

    // 1.6. Women's Safety Matching Invariants Revalidation
    const [acceptingDriver, passengerUser] = await Promise.all([
      User.findById(actorId).select("safetyMatching driverPassengerPolicy").lean(),
      User.findById((existingBooking as any).user).select("safetyMatching").lean(),
    ]);

    const driverIsVerified = isDriverVerifiedWoman(acceptingDriver);
    const driverPolicy = ((acceptingDriver as any)?.driverPassengerPolicy || "all_eligible") as DriverPassengerPolicy;
    const passengerEligible = Boolean((passengerUser as any)?.safetyMatching?.womenOnlyEligible);
    const passengerPreference = ((existingBooking as any).driverPreference || "any") as DriverPreference;

    const safetyCheck = evaluateSafetyMatch({
      passengerDriverPreference: passengerPreference,
      driverPassengerPolicy: driverPolicy,
      driverIsVerifiedWoman: driverIsVerified,
      passengerEligibleForWomenOnly: passengerEligible,
    });

    if (!safetyCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: safetyCheck.reason || "Incompatible safety preferences between rider and driver.",
          errorCode: safetyCheck.code || "SAFETY_MATCH_INCOMPATIBLE",
        },
        { status: 403 }
      );
    }
  }

  // 2. Concurrency Safety: Ensure driver is not already committed to another active trip within fresh window
  if (actorId && actorRole === "driver") {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const driverIdQuery: any[] = [actorId];
    try {
      driverIdQuery.push(new Types.ObjectId(actorId));
    } catch (_) {}

    const activeRide = await Booking.findOne({
      driver: { $in: driverIdQuery },
      _id: { $ne: id },
      $or: [
        {
          status: {
            $in: [
              "confirmed",
              "driver_assigned",
              "driver_arriving",
              "driver_arrived",
              "started",
              "ride_started",
              "ride_in_progress",
            ],
          },
          updatedAt: { $gte: twoHoursAgo },
        },
        {
          status: "awaiting_payment",
          updatedAt: { $gte: tenMinutesAgo },
        },
      ],
    });

    if (activeRide) {
      return NextResponse.json(
        {
          message:
            "You already have an active ride in progress. Complete or conclude your current trip before accepting another.",
          errorCode: "DRIVER_BUSY",
          activeRideId: activeRide._id,
        },
        { status: 409 }
      );
    }

    // 3. Platform Dues Enforcement: Check if driver has excessive unpaid platform commission from cash rides
    const driverWallet = await Wallet.findOne({ userId: actorId }).select("platformDues");
    if (driverWallet && (driverWallet.platformDues || 0) > MAX_ALLOWED_PLATFORM_DUES) {
      return NextResponse.json(
        {
          success: false,
          errorCode: "EXCESSIVE_PLATFORM_DUES",
          message: `Your account has ₹${driverWallet.platformDues} in unpaid platform commission. Please settle dues in your Driver Wallet to accept new rides.`,
          platformDues: driverWallet.platformDues,
          settleUrl: "/partner/wallet",
        },
        { status: 403 }
      );
    }
  }

  const isPaidOrCash = existingBooking?.paymentStatus === "paid" || existingBooking?.paymentStatus === "cash";
  const targetStatus = isPaidOrCash ? "confirmed" : "awaiting_payment";

  const duration = 15;
  const now = new Date();

  let driverPhone = "";
  let driverVehicleId: any = undefined;
  if (actorId) {
    const [driverUser, driverVehicle] = await Promise.all([
      User.findById(actorId).select("mobileNumber name").lean(),
      Vehicle.findOne({ owner: actorId, status: { $ne: "rejected" } }).select("_id").lean(),
    ]);
    if (driverUser?.mobileNumber) {
      driverPhone = driverUser.mobileNumber;
    }
    if (driverVehicle?._id) {
      driverVehicleId = driverVehicle._id;
    }
  }

  const payload: any = {
    driver: actorId || undefined,
    vehicle: driverVehicleId || undefined,
    driverMobileNumber: driverPhone || "",
    acceptedAt: now,
    paymentDeadline: new Date(Date.now() + 5 * 60 * 1000),
    estimatedDropoffTime: new Date(Date.now() + duration * 60 * 1000),
  };

  if (!existingBooking?.pickupOtp) {
    payload.pickupOtp = generateSecureOtp(4);
    payload.pickupOtpExpires = new Date(Date.now() + 60 * 60 * 1000);
  }

  const transitionRes = await transitionBookingState({
    bookingId: id,
    targetStatus,
    actorId,
    actorRole,
    payload,
  });

  if (!transitionRes.success) {
    const status = transitionRes.errorCode === "RACE_CONDITION" ? 409 : transitionRes.errorCode === "UNAUTHORIZED" ? 403 : 400;
    return NextResponse.json({ message: transitionRes.message || "Could not accept booking" }, { status });
  }

  const booking = transitionRes.booking!;

  try {
    await emitSocketEvent({
      userId: booking.user.toString(),
      event: "booking-updated",
      data: {
        bookingId: booking._id.toString(),
        status: targetStatus,
        paymentStatus: booking.paymentStatus,
        driver: booking.driver,
        driverMobileNumber: booking.driverMobileNumber,
        pickupOtp: booking.pickupOtp,
      },
      directBookingId: booking._id.toString(),
    });
  } catch (socketErr) {
    console.warn("Socket notification in accept route failed:", socketErr);
  }

  try {
    const { sendPushToUser } = await import("@/lib/webPush");
    await sendPushToUser(booking.user.toString(), {
      title: "Driver Accepted Your Ride! 🚗",
      body: "Your driver is heading to the pickup location.",
      url: `/ride/${booking._id}`,
    });
  } catch (pushErr) {
    console.warn("Push notification error on accept:", pushErr);
  }


  return NextResponse.json({ success: true, booking: withoutRiderSecrets(booking), isDuplicate: transitionRes.isDuplicateCall });
}