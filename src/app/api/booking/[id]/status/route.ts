import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";

export async function GET(
  req: Request,
  context: { params:Promise< { id: string }> }
) {
  await connectDb();
const id=(await context.params).id
  const booking = await Booking.findById(id);

  if (!booking)
    return NextResponse.json({ status: "expired" });

  return NextResponse.json({ status: booking.status });
}