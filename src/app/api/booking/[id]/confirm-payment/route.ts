import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  context: { params:Promise< { id: string } >}
) {
  await connectDb();
   const id=(await context.params).id
  const { method } = await req.json();
  const booking = await Booking.findById(id);

  if (!booking || booking.status !== "awaiting_payment")
    return NextResponse.json({ message: "Invalid" }, { status: 400 });

  booking.status = "confirmed";
  booking.paymentStatus = method === "cash" ? "cash" : "paid";
  booking.paymentDeadline = undefined;

  await booking.save();

  return NextResponse.json({ success: true });
}