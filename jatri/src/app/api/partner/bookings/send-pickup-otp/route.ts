import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import { auth } from "@/auth";
import { sendMail } from "@/lib/mailer";
import { generateSecureOtp } from "@/lib/cryptoOtp";
import { emitSocketEvent } from "@/lib/socketServerEmit";

export async function POST(req: Request) {
  await connectDB();

  try {
    // ── Authentication ───────────────────────────────────────────────────
    const session = await auth();
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    if (!userId && !userEmail) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const caller = userId
      ? await User.findById(userId).select("_id role").lean()
      : await User.findOne({ email: userEmail }).select("_id role").lean();

    if (!caller) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { bookingId } = await req.json();

    const booking = await Booking.findById(bookingId).populate("user");

    if (!booking) {
      return NextResponse.json(
        { message: "Booking not found" },
        { status: 404 }
      );
    }

    // ── Authorization: caller must be the assigned driver or an admin ────
    const isAdmin = (caller as any).role === "admin";
    const isAssignedDriver =
      booking.driver?.toString() === (caller as any)._id.toString();

    if (!isAdmin && !isAssignedDriver) {
      return NextResponse.json(
        { message: "Forbidden: only the assigned driver may send the pickup OTP" },
        { status: 403 }
      );
    }

    /* Generate or reuse valid OTP using CSPRNG */
    const otp =
      booking.pickupOtp &&
      booking.pickupOtpExpires &&
      new Date(booking.pickupOtpExpires) > new Date()
        ? booking.pickupOtp
        : generateSecureOtp(4);

    booking.pickupOtp = otp;
    booking.pickupOtpExpires = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes

    await booking.save();

    /* Send Mail safely (do not crash if email service fails) */
    if ((booking.user as any)?.email) {
      try {
        await sendMail(
          (booking.user as any).email,
          "Your Pickup OTP - RideNow",
          `
          <div style="font-family:sans-serif;padding:20px">
            <h2>Ride Pickup OTP</h2>
            <p>Your driver has arrived at the pickup location.</p>
            <p>Your 4-digit Pickup OTP is:</p>
            <h1 style="letter-spacing:6px;font-size:32px;color:#18181b;">${otp}</h1>
            <p>This OTP is valid for 60 minutes.</p>
            <p>Share this code with your driver to start the ride safely.</p>
            <br/>
            <b>RideNow Mobility</b>
          </div>
          `
        );
      } catch (mailErr) {
        console.warn("sendMail error in send-pickup-otp (safely ignored):", mailErr);
      }
    }

    /* Send WhatsApp notification if user mobile is available */
    const userPhone =
      booking.userMobileNumber || (booking.user as any)?.mobileNumber;
    if (userPhone) {
      try {
        const { sendWhatsAppOtp } = await import("@/lib/whatsapp");
        await sendWhatsAppOtp(userPhone, otp);
      } catch (waErr) {
        console.warn("WhatsApp OTP dispatch error in send-pickup-otp:", waErr);
      }
    }

    /* Notify passenger via socket */
    try {
      await emitSocketEvent({
        userId: (booking.user as any)._id.toString(),
        event: "booking-updated",
        data: {
          bookingId: booking._id.toString(),
          pickupOtp: otp,
        },
        directBookingId: booking._id.toString(),
      });
    } catch (err) {
      console.error("Socket notification for pickup OTP failed:", err);
    }

    // Trigger Web Push to passenger
    try {
      const { sendPushToUser } = await import("@/lib/webPush");
      await sendPushToUser((booking.user as any)._id.toString(), {
        title: "Driver Has Arrived 📍",
        body: `Your driver has arrived at ${booking.pickupAddress}. Open Jaatri to view your trip details.`,
        url: `/ride/${booking._id}`,
      });
    } catch (pushErr) {
      console.warn("Push notification error on driver arrival:", pushErr);
    }

    // Security Hardening: Never leak secret OTP in API response
    return NextResponse.json({
      success: true,
      message: "Pickup OTP sent to passenger",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "OTP send failed" },
      { status: 500 }
    );
  }
}