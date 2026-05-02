import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import { auth } from "@/auth";

export async function GET() {
  await connectDb();

  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ booking: null });

  const booking = await Booking.findOne({
    driver: session.user.id,
    status: {
      $in: ["requested", "awaiting_payment", "confirmed", "started"],
    },
  }).sort({ createdAt: -1 }).populate("user driver vehicle")
  

  return NextResponse.json( booking );
}