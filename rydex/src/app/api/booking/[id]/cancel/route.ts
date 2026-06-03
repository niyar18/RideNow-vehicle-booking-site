import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await connectDb();
const id =(await context.params).id
  const booking =await Booking.findOneAndUpdate(
  { _id: id, status: "requested" },
  { status: "cancelled" }
);

  if (!booking)
    return NextResponse.json({ message: "Not found" }, { status: 404 });
booking.status = "cancelled";



  await booking.save();

  try {
    await fetch(`${process.env.NEXT_PUBLIC_SOCKET_SERVER}/emit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: booking.driver ? booking.driver.toString() : undefined,
        event: "booking-updated",
        data: {
          bookingId: booking._id.toString(),
          status: "cancelled"
        }
      })
    });
  } catch (err) {
    console.error("Socket cancel emit failed:", err);
  }

  return NextResponse.json({ success: true });
}