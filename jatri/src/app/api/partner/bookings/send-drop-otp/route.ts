import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Booking from "@/models/booking.model";
import { sendMail } from "@/lib/mailer";


export async function POST(req: Request) {

  await connectDB();

  try {

    const { bookingId } = await req.json();

    const booking = await Booking
      .findById(bookingId)
      .populate("user");

    if (!booking) {
      return NextResponse.json(
        { message: "Booking not found" },
        { status: 404 }
      );
    }

    if (booking.status !== "started") {
      return NextResponse.json(
        { message: "Drop-off OTP can only be generated after the ride has started." },
        { status: 400 }
      );
    }

    /* Generate or reuse valid OTP - Guarantee it is distinct from pickup OTP */
    let otp =
      booking.dropOtp &&
      booking.dropOtpExpires &&
      new Date(booking.dropOtpExpires) > new Date()
        ? booking.dropOtp
        : Math.floor(1000 + Math.random() * 9000).toString();

    // Ensure Drop OTP is never identical to Pickup OTP
    if (booking.pickupOtp && otp === booking.pickupOtp) {
      otp = Math.floor(1000 + Math.random() * 9000).toString();
    }

    booking.dropOtp = otp;
    booking.dropOtpExpires = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes

    await booking.save();

    /* Send Mail safely (do not crash if email service fails) */
    if (booking.user?.email) {
      try {
        await sendMail(
          booking.user.email,
          "Your Drop OTP - RideNow",
          `
          <div style="font-family:sans-serif;padding:20px">
            <h2>Trip Drop-off OTP</h2>
            <p>Your driver has reached the destination.</p>
            <p>Your 4-digit Drop OTP is:</p>
            <h1 style="letter-spacing:6px;font-size:32px;color:#18181b;">${otp}</h1>
            <p>This OTP is valid for 60 minutes.</p>
            <p>Share this OTP with your driver to complete the ride.</p>
            <br/>
            <b>RideNow Mobility</b>
          </div>
          `
        );
      } catch (mailErr) {
        console.warn("sendMail error in send-drop-otp (safely ignored):", mailErr);
      }
    }

    /* Send WhatsApp notification if user mobile is available */
    const userPhone = booking.userMobileNumber || (booking.user as any)?.mobileNumber;
    if (userPhone) {
      try {
        const { sendWhatsAppOtp } = await import("@/lib/whatsapp");
        await sendWhatsAppOtp(userPhone, otp);
      } catch (waErr) {
        console.warn("WhatsApp OTP dispatch error in send-drop-otp:", waErr);
      }
    }

    /* Notify passenger via socket */
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SOCKET_SERVER}/emit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: booking.user._id.toString(),
          event: "booking-updated",
          data: {
            bookingId: booking._id.toString(),
            dropOtp: otp,
          },
        }),
      });
    } catch (err) {
      console.error("Socket notification for drop OTP failed:", err);
    }

    // Trigger Web Push to passenger
    try {
      const { sendPushToUser } = await import("@/lib/webPush");
      await sendPushToUser(booking.user._id.toString(), {
        title: "Arrived at Destination 🏁",
        body: `Share drop OTP ${otp} with your driver to end the trip.`,
        url: `/ride/${booking._id}`,
      });
    } catch (pushErr) {
      console.warn("Push notification error on drop arrival:", pushErr);
    }

    return NextResponse.json({
      success: true,
      message: "Drop OTP sent",
      dropOtp: otp,
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      { message: "OTP send failed" },
      { status: 500 }
    );

  }

}