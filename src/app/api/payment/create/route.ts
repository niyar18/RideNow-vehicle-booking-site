import { NextResponse } from "next/server"
import razorpay from "@/lib/razorpay"
import connectDb from "@/lib/db"
import Booking from "@/models/booking.model"



export async function POST(req: Request) {

  await connectDb()

  const { bookingId } = await req.json()

  const booking = await Booking.findById(bookingId)

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" })
  }

  const order = await razorpay.orders.create({
    amount: booking.fare * 100,
    currency: "INR",
    receipt: booking._id.toString(),
  })

  booking.status = "awaiting_payment"
  await booking.save()

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount
  })
}