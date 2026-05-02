import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/db";
import User from "@/models/user.model";

export async function PATCH() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const vendor = await User.findById(session.user.id);

    if (!vendor || vendor.role !== "vendor") {
      return NextResponse.json(
        { message: "Vendor not found" },
        { status: 404 }
      );
    }

    // Allow only if previously rejected
    if (vendor.videoKycStatus !== "rejected") {
      return NextResponse.json(
        { message: "Cannot request again now" },
        { status: 400 }
      );
    }

    vendor.videoKycStatus = "pending";
    vendor.videoKycRejectionReason = undefined;
    vendor.videoKycRoomId = undefined;

    await vendor.save();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}