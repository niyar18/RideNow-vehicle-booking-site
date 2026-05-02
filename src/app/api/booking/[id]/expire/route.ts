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
  { status: "expired" }
);
  if (!booking)
    return NextResponse.json({ message: "Not found" }, { status: 404 });
booking.status = "expired";



  await booking.save();

  return NextResponse.json({ success: true });
}