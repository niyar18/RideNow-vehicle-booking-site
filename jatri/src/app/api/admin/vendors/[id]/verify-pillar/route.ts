export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import { auth } from "@/auth";
import User, { IDriverVerificationStatus, VerificationItemStatus } from "@/models/user.model";
import VehicleDocument from "@/models/vehicleDocument.model";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDb();

    /* ---------- AUTH ---------- */
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const vendorId = (await context.params).id;
    const body = await req.json();
    const { pillar, status, rejectionReason } = body as {
      pillar: keyof IDriverVerificationStatus;
      status: VerificationItemStatus;
      rejectionReason?: string;
    };

    const validPillars: (keyof IDriverVerificationStatus)[] = [
      "identity",
      "drivingLicense",
      "face",
      "background",
      "address",
      "bank",
      "vehicle",
    ];

    if (!pillar || !validPillars.includes(pillar)) {
      return NextResponse.json(
        { message: `Invalid pillar. Must be one of: ${validPillars.join(", ")}` },
        { status: 400 }
      );
    }

    const validStatuses: VerificationItemStatus[] = [
      "not_submitted",
      "pending",
      "verified",
      "rejected",
      "expired",
    ];

    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const driver = await User.findById(vendorId);
    if (!driver || driver.role !== "vendor") {
      return NextResponse.json({ message: "Driver not found" }, { status: 404 });
    }

    if (!driver.driverVerificationStatus) {
      driver.driverVerificationStatus = {
        identity: "not_submitted",
        drivingLicense: "not_submitted",
        face: "not_submitted",
        background: "not_submitted",
        address: "not_submitted",
        bank: "not_submitted",
        vehicle: "not_submitted",
      };
    }

    driver.driverVerificationStatus[pillar] = status;

    // Also update VehicleDocument status if relevant
    const doc = await VehicleDocument.findOne({ owner: vendorId });
    if (doc) {
      if (pillar === "vehicle") {
        doc.rcStatus = status;
        doc.insuranceStatus = status;
        if (status === "rejected" && rejectionReason) {
          doc.rejectionReason = rejectionReason;
        }
      } else if (pillar === "drivingLicense") {
        doc.licenseStatus = status;
      } else if (pillar === "identity") {
        doc.panStatus = status;
      } else if (pillar === "background") {
        doc.policeVerificationStatus = status;
      }
      await doc.save();
    }

    // Auto-approve vendor if all 4 core pillars (identity, DL, bank, vehicle) are verified
    const vStatus = driver.driverVerificationStatus;
    const coreVerified =
      vStatus.identity === "verified" &&
      vStatus.drivingLicense === "verified" &&
      vStatus.vehicle === "verified" &&
      vStatus.bank === "verified";

    if (coreVerified && driver.vendorStatus !== "approved") {
      driver.vendorStatus = "approved";
      driver.vendorApprovedAt = new Date();
      driver.isVendorBlocked = false;
    } else if (status === "rejected") {
      driver.vendorStatus = "rejected";
      if (rejectionReason) driver.vendorRejectionReason = rejectionReason;
    }

    driver.markModified("driverVerificationStatus");
    await driver.save();

    return NextResponse.json({
      success: true,
      message: `Pillar '${pillar}' updated to '${status}' successfully`,
      driverVerificationStatus: driver.driverVerificationStatus,
      vendorStatus: driver.vendorStatus,
    });
  } catch (error) {
    console.error("ADMIN VERIFY PILLAR ERROR:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
