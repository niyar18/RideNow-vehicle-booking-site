import connectDb from "@/lib/db"
import Booking from "@/models/booking.model"
import crypto from "crypto"



export async function POST(req: Request) {

  await connectDb()

  const {
    bookingId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  } = await req.json()

  const body = razorpay_order_id + "|" + razorpay_payment_id

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest("hex")

  if (expectedSignature !== razorpay_signature) {
    return Response.json({ success:false, message:"Invalid signature" })
  }

  const booking = await Booking.findById(bookingId)

  if (!booking) {
    return Response.json({ success:false })
  }

  /* SPLIT CALCULATION */

  const adminCommission = booking.fare * 0.10
  const partnerAmount = booking.fare - adminCommission

  booking.paymentStatus = "paid"
  booking.status = "confirmed"

  booking.adminCommission = adminCommission
  booking.partnerAmount = partnerAmount

  await booking.save()

  return Response.json({
    success:true,
    adminCommission,
    partnerAmount
  })
}