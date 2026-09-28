import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/db";
import User from "@/models/user.model";

export async function PATCH(
  req: Request,
 context:{params: Promise<{ vendorId: string; }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const vendor = await User.findById((await context.params).vendorId);

    if (!vendor || vendor.role !== "vendor") {
      return NextResponse.json({ message: "Vendor not found" }, { status: 404 });
    }

    const roomId = `kyc-${vendor._id}-${Date.now()}`;

    vendor.videoKycStatus = "in_progress";
    vendor.videoKycRoomId = roomId;
    vendor.vendorOnboardingStep = 4;

    await vendor.save();
    

    return NextResponse.json({ roomId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
