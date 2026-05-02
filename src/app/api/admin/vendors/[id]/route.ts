import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/db";

import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import VehicleDocument from "@/models/vehicleDocument.model";
import PartnerBank from "@/models/partnerBank.model";

/* ================================
   GET → Single Vendor Full Review
================================ */

export async function GET(
  req: NextRequest,
  context:{ params: Promise<{ id: string; }> }
) {
  try {
    const session = await auth();

    /* ---------- AUTH ---------- */
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDb();

    const vendorId = (await context.params).id;

    /* ---------- USER ---------- */
    const user = await User.findById(vendorId)
      .select(
        "name email role vendorStatus vendorOnboardingStep"
      )
      .lean();

    if (!user || user.role !== "vendor") {
      return NextResponse.json(
        { message: "Vendor not found" },
        { status: 404 }
      );
    }

    /* ---------- VEHICLE ---------- */
    const vehicle = await Vehicle.findOne({
      owner: vendorId,
    })
      .select("type number vehicleModel")
      .lean();

    /* ---------- DOCUMENTS ---------- */
    const documents = await VehicleDocument.findOne({
      owner: vendorId,
    })
      .select(
        "aadhaarUrl licenseUrl rcUrl status rejectionReason"
      )
      .lean();

    /* ---------- BANK ---------- */
    const bank = await PartnerBank.findOne({
      owner: vendorId,
    })
      .select(
        "accountHolderName ifsc upi status"
      )
      .lean();

    /* ---------- RESPONSE ---------- */
    return NextResponse.json({
      success: true,
      vendor: {
        _id: user._id,
        name: user.name,
        email: user.email,
        vendorStatus: user.vendorStatus,
        vendorOnboardingStep: user.vendorOnboardingStep,

        vehicle: vehicle
          ? {
              type: vehicle.type,
              number: vehicle.number,
              model: vehicle.vehicleModel,
            }
          : null,

        documents: documents || null,
        bank: bank || null,
      },
    });
  } catch (error) {
    console.error("ADMIN VENDOR REVIEW ERROR:", error);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}
