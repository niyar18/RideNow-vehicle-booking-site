import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/db";
import User from "@/models/user.model";

export async function PATCH(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { roomId, action, reason } = await req.json();

    if (!roomId) {
      return NextResponse.json(
        { message: "Room ID required" },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { message: "Invalid action" },
        { status: 400 }
      );
    }

    await connectDB();

    const vendor = await User.findOne({
      videoKycRoomId: roomId,
      role: "vendor",
    });

    if (!vendor) {
      return NextResponse.json(
        { message: "Vendor not found" },
        { status: 404 }
      );
    }

    if (action === "approve") {
      vendor.videoKycStatus = "approved";
      vendor.videoKycRejectionReason = undefined;

      if (vendor.vendorOnboardingStep < 5) {
        vendor.vendorOnboardingStep = 5;
      }
    }

    if (action === "reject") {
      if (!reason || !reason.trim()) {
        return NextResponse.json(
          { message: "Rejection reason required" },
          { status: 400 }
        );
      }

      vendor.videoKycStatus = "rejected";
      vendor.videoKycRejectionReason = reason.trim();
    }

    await vendor.save();

    return NextResponse.json({
      success: true,
      status: vendor.videoKycStatus,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}