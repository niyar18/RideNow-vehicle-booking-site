import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import { auth } from "@/auth";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDb();
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const id = (await context.params).id;
    const { inviteeEmail, inviteeName } = await req.json();

    const booking = await Booking.findById(id);
    if (!booking) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    }

    // Ensure group mode is activated
    booking.isGroupRide = true;
    if (!booking.groupInviteCode) {
      booking.groupInviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    // Initialize group members if empty
    if (!booking.groupMembers || booking.groupMembers.length === 0) {
      booking.groupMembers = [
        {
          user: session.user.id,
          name: session.user.name || "Ride Creator",
          email: session.user.email || "creator@ridenow.app",
          status: "creator",
          shareAmount: booking.fare,
        },
      ];
    }

    // Add new invited friend if provided
    if (inviteeEmail && inviteeName) {
      const alreadyInvited = booking.groupMembers.some((m: any) => m.email.toLowerCase() === inviteeEmail.toLowerCase());
      if (!alreadyInvited) {
        booking.groupMembers.push({
          name: inviteeName,
          email: inviteeEmail.toLowerCase(),
          status: "pending",
          shareAmount: 0,
        });
      }
    }

    // Recompute fare split among participating members (creator + accepted + pending)
    const participatingCount = Math.max(1, booking.groupMembers.filter((m: any) => m.status !== "declined").length);
    const splitPerPerson = Math.round(booking.fare / participatingCount);
    booking.splitFarePerPerson = splitPerPerson;

    booking.groupMembers.forEach((m: any) => {
      if (m.status !== "declined") {
        m.shareAmount = splitPerPerson;
      }
    });

    await booking.save();

    // Broadcast socket event
    try {
      const socketServer = process.env.NEXT_PUBLIC_SOCKET_SERVER;
      if (socketServer && booking.user) {
        await fetch(`${socketServer}/emit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: booking.user.toString(),
            event: "booking-updated",
            data: { bookingId: booking._id.toString(), isGroupRide: true, groupMembers: booking.groupMembers, splitFarePerPerson: splitPerPerson },
          }),
        });
      }
    } catch (socketErr) {
      console.error("Socket emit error during group invite:", socketErr);
    }

    return NextResponse.json({ success: true, booking, groupInviteCode: booking.groupInviteCode, splitFarePerPerson: splitPerPerson });
  } catch (err) {
    console.error("Group invite API error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
