import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const session = await auth();
    const { inviteCode, action = "accept" } = await req.json();

    if (!inviteCode) {
      return NextResponse.json({ message: "Invite code is required" }, { status: 400 });
    }

    const booking = await Booking.findOne({
      groupInviteCode: inviteCode.trim().toUpperCase(),
    });

    if (!booking) {
      return NextResponse.json({ message: "Invalid group invite code" }, { status: 404 });
    }

    const userName = session?.user?.name || "Friend";
    const userEmail = session?.user?.email || `friend_${Math.random().toString(36).slice(2, 7)}@ridenow.app`;
    const userId = session?.user?.id;

    if (!booking.groupMembers) booking.groupMembers = [];

    // Find existing member entry or add new
    let memberIndex = booking.groupMembers.findIndex(
      (m: any) => (userId && m.user?.toString() === userId) || (m.email.toLowerCase() === userEmail.toLowerCase())
    );

    if (memberIndex !== -1) {
      booking.groupMembers[memberIndex].status = action === "accept" ? "accepted" : "declined";
      if (userId) booking.groupMembers[memberIndex].user = userId;
    } else {
      booking.groupMembers.push({
        user: userId ? userId : undefined,
        name: userName,
        email: userEmail.toLowerCase(),
        status: action === "accept" ? "accepted" : "declined",
        shareAmount: 0,
      });
    }

    // Recalculate split fare per person among active members (creator + accepted + pending)
    const activeMembers = booking.groupMembers.filter((m: any) => m.status !== "declined");
    const activeCount = Math.max(1, activeMembers.length);
    const splitPerPerson = Math.round(booking.fare / activeCount);
    booking.splitFarePerPerson = splitPerPerson;

    booking.groupMembers.forEach((m: any) => {
      if (m.status !== "declined") {
        m.shareAmount = splitPerPerson;
      } else {
        m.shareAmount = 0;
      }
    });

    await booking.save();

    // Broadcast socket event to creator and group
    try {
      const socketServer = process.env.NEXT_PUBLIC_SOCKET_SERVER;
      if (socketServer && booking.user) {
        await fetch(`${socketServer}/emit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: booking.user.toString(),
            event: "booking-updated",
            data: { bookingId: booking._id.toString(), groupMembers: booking.groupMembers, splitFarePerPerson: splitPerPerson },
          }),
        });
      }
    } catch (socketErr) {
      console.error("Socket emit error during group join:", socketErr);
    }

    return NextResponse.json({
      success: true,
      booking,
      splitFarePerPerson: splitPerPerson,
      memberCount: activeCount,
    });
  } catch (err) {
    console.error("Group join API error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
