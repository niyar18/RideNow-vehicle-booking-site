import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import { auth } from "@/auth";

import User from "@/models/user.model";
import VehicleDocument from "@/models/vehicleDocument.model";
import PartnerBank from "@/models/partnerBank.model";

export async function POST(
  req: NextRequest,
  context:{params: Promise<{ id: string; }> }
) {
  try {
    await connectDb();

    /* ---------- AUTH ---------- */
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const vendorId = (await context.params).id;

    /* ---------- USER ---------- */
    const user = await User.findById(vendorId);
    if (!user || user.role !== "vendor") {
      return NextResponse.json(
        { message: "Vendor not found" },
        { status: 404 }
      );
    }

    if (user.vendorStatus === "approved") {
      return NextResponse.json(
        { message: "Vendor already approved" },
        { status: 400 }
      );
    }

    /* ---------- BASIC SAFETY CHECKS ---------- */
    const docs = await VehicleDocument.findOne({ owner: vendorId });
    const bank = await PartnerBank.findOne({ owner: vendorId });

    if (!docs || !bank) {
      return NextResponse.json(
        { message: "Vendor onboarding incomplete" },
        { status: 400 }
      );
    }

    /* ---------- APPROVE ---------- */
    user.vendorStatus = "approved";
    user.isVendorBlocked = false;
    user.vendorOnboardingStep=4
    user.videoKycStatus = "pending";
    user.vendorApprovedAt = new Date(); // optional field
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Vendor approved successfully",
    });
  } catch (error) {
    console.error("APPROVE VENDOR ERROR:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
