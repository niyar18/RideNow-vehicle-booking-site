export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User, { IDriverVerificationStatus } from "@/models/user.model";
import VehicleDocument from "@/models/vehicleDocument.model";
import PartnerBank from "@/models/partnerBank.model";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const driver = await User.findById(session.user.id).select(
      "name email mobileNumber role vendorStatus vendorOnboardingStep isVendorBlocked videoKycStatus driverVerificationStatus isOnline"
    );

    if (!driver || driver.role !== "vendor") {
      return NextResponse.json({ message: "Driver account not found" }, { status: 403 });
    }

    const doc = await VehicleDocument.findOne({ owner: driver._id }).lean();
    const bank = await PartnerBank.findOne({ owner: driver._id }).lean();

    const now = new Date();

    // Initialize or read status
    const status: IDriverVerificationStatus = driver.driverVerificationStatus || {
      identity: "not_submitted",
      drivingLicense: "not_submitted",
      face: "not_submitted",
      background: "not_submitted",
      address: "not_submitted",
      bank: "not_submitted",
      vehicle: "not_submitted",
    };

    const blockingReasons: string[] = [];

    // Check bank
    if (bank && bank.status === "verified") {
      status.bank = "verified";
    } else if (bank) {
      status.bank = "pending";
      blockingReasons.push("Bank account verification is pending");
    } else {
      status.bank = "not_submitted";
      blockingReasons.push("Bank account details have not been submitted");
    }

    // Check Face / Video KYC
    if (driver.videoKycStatus === "approved") {
      status.face = "verified";
    } else if (driver.videoKycStatus === "in_progress" || driver.videoKycStatus === "pending") {
      status.face = "pending";
      blockingReasons.push("Live Face / Video KYC verification is pending");
    } else {
      status.face = "not_submitted";
      blockingReasons.push("Face / Video KYC check not completed");
    }

    // Check Document Expirations
    let isVehicleCompliant = true;

    if (doc) {
      // DL Expiry
      if (doc.licenseExpiry && new Date(doc.licenseExpiry) < now) {
        status.drivingLicense = "expired";
        blockingReasons.push("Driving licence has expired. Please upload a renewed licence.");
      } else if (doc.licenseUrl && status.drivingLicense !== "verified") {
        status.drivingLicense = "pending";
      }

      // Insurance Expiry
      if (doc.insuranceExpiry && new Date(doc.insuranceExpiry) < now) {
        status.vehicle = "expired";
        isVehicleCompliant = false;
        blockingReasons.push("Vehicle insurance policy has expired. Active insurance is required to accept rides.");
      }

      // Fitness Expiry
      if (doc.fitnessExpiry && new Date(doc.fitnessExpiry) < now) {
        status.vehicle = "expired";
        isVehicleCompliant = false;
        blockingReasons.push("Vehicle fitness certificate has expired.");
      }

      // PUC Expiry
      if (doc.pucExpiry && new Date(doc.pucExpiry) < now) {
        status.vehicle = "expired";
        isVehicleCompliant = false;
        blockingReasons.push("Pollution Under Control (PUC) certificate has expired.");
      }

      // RC check
      if (!doc.rcUrl && !doc.rcNumber) {
        isVehicleCompliant = false;
        status.vehicle = "not_submitted";
        blockingReasons.push("Vehicle Registration Certificate (RC) has not been submitted.");
      }
    } else {
      isVehicleCompliant = false;
      status.vehicle = "not_submitted";
      status.drivingLicense = "not_submitted";
      blockingReasons.push("Vehicle documents have not been submitted.");
    }

    if (driver.vendorStatus !== "approved") {
      blockingReasons.push("Partner application is under admin review.");
    }

    if (driver.isVendorBlocked) {
      blockingReasons.push("Partner account is temporarily restricted. Please contact driver support.");
    }

    // Derived eligibility
    const canGoOnline =
      driver.vendorStatus === "approved" &&
      !driver.isVendorBlocked &&
      status.drivingLicense === "verified" &&
      status.vehicle === "verified" &&
      status.bank === "verified" &&
      isVehicleCompliant;

    return NextResponse.json({
      success: true,
      canGoOnline,
      blockingReasons,
      verificationStatus: status,
      vendorStatus: driver.vendorStatus,
      isOnline: driver.isOnline,
      documentSummary: {
        hasAadhaar: Boolean(doc?.aadhaarUrl || doc?.aadhaarMaskedNumber),
        hasPAN: Boolean(doc?.panUrl || doc?.panNumber),
        hasLicense: Boolean(doc?.licenseUrl || doc?.licenseNumber),
        licenseExpiry: doc?.licenseExpiry || null,
        hasRC: Boolean(doc?.rcUrl || doc?.rcNumber),
        rcExpiry: doc?.rcExpiry || null,
        hasInsurance: Boolean(doc?.insuranceUrl || doc?.insurancePolicyNumber),
        insuranceExpiry: doc?.insuranceExpiry || null,
        hasPUC: Boolean(doc?.pucUrl),
        pucExpiry: doc?.pucExpiry || null,
        hasFitness: Boolean(doc?.fitnessUrl),
        fitnessExpiry: doc?.fitnessExpiry || null,
        hasPermit: Boolean(doc?.permitUrl),
        permitExpiry: doc?.permitExpiry || null,
        hasPoliceVerification: Boolean(doc?.policeVerificationUrl),
      },
    });
  } catch (error) {
    console.error("GET VERIFICATION STATUS ERROR:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
