import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await connectDb();
  const id = (await context.params).id;
  const booking = await Booking.findOneAndUpdate(
    { _id: id, status: { $in: ["requested", "awaiting_payment", "confirmed"] } },
    { status: "cancelled" },
    { new: true }
  );

  if (!booking)
    return NextResponse.json({ message: "Not found" }, { status: 404 });

  try {
    // Emit to driver socket
    if (booking.driver) {
      await fetch(`${process.env.NEXT_PUBLIC_SOCKET_SERVER}/emit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: booking.driver.toString(),
          event: "booking-updated",
          data: {
            bookingId: booking._id.toString(),
            status: "cancelled"
          }
        })
      });
    }

    // Emit to passenger socket
    await fetch(`${process.env.NEXT_PUBLIC_SOCKET_SERVER}/emit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: booking.user.toString(),
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