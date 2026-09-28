import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import axios from "axios";

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const { bookingId } = await req.json();

    if (!bookingId) {
      return NextResponse.json({ message: "Booking ID is required" }, { status: 400 });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking || booking.status !== "requested") {
      return NextResponse.json({ message: "Booking not eligible for escalation" }, { status: 400 });
    }

    const nextIndex = booking.currentDriverIndex + 1;
    if (nextIndex < booking.candidateDrivers.length) {
      const nextDriverId = booking.candidateDrivers[nextIndex];
      const nextDriver = await User.findById(nextDriverId);

      booking.currentDriverIndex = nextIndex;
      if (nextDriver) {
        booking.driver = nextDriver._id;
        booking.driverMobileNumber = nextDriver.mobileNumber || "";
      }
      await booking.save();

      // Emit new dispatch request to the next candidate driver
      try {
        const socketServer = process.env.NEXT_PUBLIC_SOCKET_SERVER;
        if (socketServer && nextDriver) {
          await axios.post(`${socketServer}/emit`, {
            userId: nextDriver._id.toString(),
            event: "new-booking",
            data: booking,
          });
        }
      } catch (err) {
        console.error("Socket emission error during auto-dispatch escalation:", err);
      }

      return NextResponse.json({ success: true, escalated: true, currentDriverIndex: nextIndex });
    } else {
      // All candidate drivers exhausted
      booking.status = "expired";
      await booking.save();

      try {
        const socketServer = process.env.NEXT_PUBLIC_SOCKET_SERVER;
        if (socketServer && booking.user) {
          await axios.post(`${socketServer}/emit`, {
            userId: booking.user.toString(),
            event: "booking-updated",
            data: { bookingId: booking._id.toString(), status: "expired" },
          });
        }
      } catch (err) {
        console.error("Socket emission error during expiry:", err);
      }

      return NextResponse.json({ success: true, escalated: false, status: "expired" });
    }
  } catch (err) {
    console.error("Dispatch escalation error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
