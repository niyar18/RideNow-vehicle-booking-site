import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import { FareQuoteError, getBookingQuote } from "@/lib/bookingQuote.server";
import { rateLimiter } from "@/lib/rateLimit";

const headers = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false, message: "Sign in to get your fare." }, { status: 401, headers });
    if (!rateLimiter.check(`booking:quote:${session.user.id}`, 30, 60_000).allowed) {
      return NextResponse.json({ success: false, message: "Too many fare requests. Please try again in a moment." }, { status: 429, headers });
    }
    const input = await request.json().catch(() => null);
    if (!input || typeof input !== "object") throw new FareQuoteError("Invalid quote request.");
    await connectDb();
    const user = await User.findById(session.user.id).select("outstandingAmount isStudent studentVerification").lean();
    if (!user) return NextResponse.json({ success: false, message: "Account not found." }, { status: 404, headers });
    const { quote } = await getBookingQuote(input, session.user.id, user as Parameters<typeof getBookingQuote>[2]);
    return NextResponse.json({ success: true, quote }, { headers });
  } catch (error) {
    if (error instanceof FareQuoteError) return NextResponse.json({ success: false, message: error.message, ...error.details }, { status: error.status, headers });
    console.error("Booking fare quote unavailable", error);
    return NextResponse.json({ success: false, message: "We couldn’t calculate your fare. Please try again." }, { status: 503, headers });
  }
}
