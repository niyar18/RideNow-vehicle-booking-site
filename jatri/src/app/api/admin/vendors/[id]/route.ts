export const dynamic = "force-dynamic";
export const revalidate = 0;

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
        "name email mobileNumber role vendorStatus vendorOnboardingStep videoKycStatus videoKycRoomId videoKycRejectionReason vendorRejectionReason driverVerificationStatus"
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
        "aadhaarUrl aadhaarMaskedNumber licenseUrl licenseNumber licenseExpiry licenseClass rcUrl rcNumber rcExpiry insuranceUrl insurancePolicyNumber insuranceExpiry insuranceType pucUrl pucExpiry fitnessUrl fitnessExpiry permitUrl permitNumber permitExpiry panUrl panNumber policeVerificationUrl status rejectionReason vehiclePhotos"
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
        mobileNumber: user.mobileNumber || null,
        vendorStatus: user.vendorStatus,
        vendorOnboardingStep: user.vendorOnboardingStep,
        videoKycStatus: user.videoKycStatus || "pending",
        videoKycRoomId: user.videoKycRoomId || null,
        videoKycRejectionReason: user.videoKycRejectionReason || null,
        vendorRejectionReason: user.vendorRejectionReason || null,
        driverVerificationStatus: user.driverVerificationStatus || null,

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
