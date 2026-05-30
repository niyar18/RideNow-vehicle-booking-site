import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import { auth } from "@/auth";

export async function GET(req: Request) {
  await connectDb();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const bookings = await Booking.find({
    driver: session.user.id,
  })
    .populate({
      path: "vehicle",
      select: "vehicleModel imageUrl type number",
    })
    .populate({
      path: "user",
      select: "name image",
    })
    .populate({
      path: "driver",
      select: "name",
    })
    .sort({ createdAt: -1 });

  return NextResponse.json({ bookings });
}