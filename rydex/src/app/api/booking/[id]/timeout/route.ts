import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import { auth } from "@/auth";
import axiosOriginal from "axios";

async function notifySocket(userId: string, event: string, data: any) {
  try {
    await axiosOriginal.post(
      `${process.env.NEXT_PUBLIC_SOCKET_SERVER}/emit`,
      { userId, event, data }
    );
  } catch (err) {
    console.error("Socket emit failed in timeout route:", err);
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await connectDb();
  const id = (await context.params).id;
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const booking = await Booking.findOne({
    _id: id,
    user: session.user.id,
    status: "requested",
  });

  if (!booking) {
    return NextResponse.json(
      { message: "Booking already accepted, processed, or invalid" },
      { status: 400 }
    );
  }

  const nextIndex = (booking.currentDriverIndex || 0) + 1;

  if (booking.candidateDrivers && nextIndex < booking.candidateDrivers.length) {
    const nextDriverId = booking.candidateDrivers[nextIndex];
    const nextDriver = await User.findById(nextDriverId).select("mobileNumber");

    booking.driver = nextDriverId;
    booking.driverMobileNumber = nextDriver?.mobileNumber || "";
    booking.currentDriverIndex = nextIndex;
    booking.status = "requested";
    await booking.save();

    // 1️⃣ Notify new driver
    await notifySocket(nextDriverId.toString(), "new-booking", booking);

    // 2️⃣ Notify customer of status change / pointer update
    await notifySocket(booking.user.toString(), "booking-updated", {
      bookingId: booking._id,
      status: "requested",
      currentDriverIndex: nextIndex,
    });
  } else {
    // Candidates exhausted
    booking.status = "rejected";
    await booking.save();

    // Notify customer
    await notifySocket(booking.user.toString(), "booking-updated", {
      bookingId: booking._id,
      status: "rejected",
    });
  }

  return NextResponse.json({ success: true });
}
