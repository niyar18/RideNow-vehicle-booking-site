import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await connectDb();
  const id = (await context.params).id;
  
  const booking = await Booking.findByIdAndUpdate(
    id,
    { 
      isPanicActive: true, 
      panicActivatedAt: new Date() 
    },
    { new: true }
  );

  if (!booking) {
    return NextResponse.json({ message: "Booking not found" }, { status: 404 });
  }

  try {
    const socketServer = process.env.NEXT_PUBLIC_SOCKET_SERVER;
    if (socketServer) {
      // Emit to driver socket
      if (booking.driver) {
        await fetch(`${socketServer}/emit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: booking.driver.toString(),
            event: "booking-updated",
            data: {
              bookingId: booking._id.toString(),
              isPanicActive: true,
              panicActivatedAt: booking.panicActivatedAt,
            }
          })
        });
      }

      // Emit to passenger socket
      if (booking.user) {
        await fetch(`${socketServer}/emit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: booking.user.toString(),
            event: "booking-updated",
            data: {
              bookingId: booking._id.toString(),
              isPanicActive: true,
              panicActivatedAt: booking.panicActivatedAt,
            }
          })
        });
      }
    }
  } catch (err) {
    console.error("Socket panic emit failed:", err);
  }

  return NextResponse.json({ success: true, isPanicActive: true, booking });
}
