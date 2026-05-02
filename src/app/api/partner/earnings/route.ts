
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import Booking from "@/models/booking.model";


export async function GET() {
  await dbConnect();

  const session = await auth();
  const driverId = session?.user?.id;

  if (!driverId) {
    return Response.json({ earnings: [] });
  }

  const bookings = await Booking.find({
    driver: driverId,
    paymentStatus: "paid",
  }).sort({ createdAt: 1 });

  const earningsMap: Record<string, number> = {};

  bookings.forEach((booking) => {
    const date = new Date(booking.createdAt).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });

    if (!earningsMap[date]) {
      earningsMap[date] = 0;
    }

    earningsMap[date] += booking.partnerAmount || 0;
  });

  const earnings = Object.entries(earningsMap).map(([date, earnings]) => ({
    date,
    earnings,
  }));

  return Response.json({
    earnings,
  });
}