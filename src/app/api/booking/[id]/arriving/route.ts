import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await connectDb();

  const booking = await Booking.findById(params.id);
  if (!booking)
    return NextResponse.json({ message: "Not found" }, { status: 404 });

booking.status = "arriving";

  await booking.save();

  return NextResponse.json({ success: true });
}