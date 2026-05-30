import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import axios from "axios";
import { NextResponse } from "next/server";


export async function GET(
  req: Request,
   context : { params: Promise<{ id: string }> }
) {
  await connectDb();
 const id=(await context.params).id
  const booking = await Booking.findById(id).populate("driver vehicle")


  return NextResponse.json(booking);
}