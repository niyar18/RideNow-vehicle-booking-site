
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
    status: "completed",
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

    const amount = booking.partnerAmount || (booking.fare - (booking.fare * 0.10)) || 0;
    earningsMap[date] += amount;
  });

  const earnings = Object.entries(earningsMap).map(([date, earnings]) => ({
    date: date,
    earnings: Number(earnings.toFixed(2)),
  }));

  return Response.json({
    earnings,
  });
}