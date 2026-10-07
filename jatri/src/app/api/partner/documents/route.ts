export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/db";

import VehicleDocument from "@/models/vehicleDocument.model";
import User from "@/models/user.model";
import uploadOnCloudinary from "@/lib/cloudinary";

/* ===========================
   GET → Fetch vendor documents
=========================== */

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDb();

    const documents = await VehicleDocument.findOne({
      owner: session.user.id,
    }).lean();

    const user = await User.findById(session.user.id)
      .select("driverVerificationStatus vendorStatus isVendorBlocked")
      .lean();

    return NextResponse.json({
      success: true,
      documents: documents || null,
      verificationStatus: user?.driverVerificationStatus || null,
      vendorStatus: user?.vendorStatus || "pending",
    });
  } catch (error) {
    console.error("GET DOCUMENT ERROR:", error);
    return NextResponse.json(
      { message: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

/* ===========================
   POST → Upload / Update docs
=========================== */

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDb();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    const formData = await req.formData();

    // File Blobs
    const aadhaar = formData.get("aadhaar") as Blob | null;
    const license = formData.get("license") as Blob | null;
    const rc = formData.get("rc") as Blob | null;
    const insurance = formData.get("insurance") as Blob | null;
    const puc = formData.get("puc") as Blob | null;
    const fitness = formData.get("fitness") as Blob | null;
    const permit = formData.get("permit") as Blob | null;
    const pan = formData.get("pan") as Blob | null;
    const policeVerification = formData.get("policeVerification") as Blob | null;

    // Metadata text fields
    const licenseNumber = formData.get("licenseNumber") as string | null;
    const licenseExpiry = formData.get("licenseExpiry") as string | null;
    const licenseClass = formData.get("licenseClass") as string | null;

    const rcNumber = formData.get("rcNumber") as string | null;
    const rcExpiry = formData.get("rcExpiry") as string | null;

    const insurancePolicyNumber = formData.get("insurancePolicyNumber") as string | null;
    const insuranceExpiry = formData.get("insuranceExpiry") as string | null;
    const insuranceType = formData.get("insuranceType") as "commercial" | "third_party" | "comprehensive" | null;

    const pucExpiry = formData.get("pucExpiry") as string | null;
    const fitnessExpiry = formData.get("fitnessExpiry") as string | null;

    const permitNumber = formData.get("permitNumber") as string | null;
    const permitExpiry = formData.get("permitExpiry") as string | null;

    const panNumber = formData.get("panNumber") as string | null;
    const aadhaarMaskedNumber = formData.get("aadhaarMaskedNumber") as string | null;

    const policeVerificationCertificateNo = formData.get("policeVerificationCertificateNo") as string | null;

    const updatePayload: any = {
      status: "pending",
      rejectionReason: null,
    };

    /* ========= METADATA UPDATES ========= */
    if (licenseNumber) updatePayload.licenseNumber = licenseNumber.trim().toUpperCase();
    if (licenseExpiry) updatePayload.licenseExpiry = new Date(licenseExpiry);
    if (licenseClass) updatePayload.licenseClass = licenseClass.trim();

    if (rcNumber) updatePayload.rcNumber = rcNumber.trim().toUpperCase();
    if (rcExpiry) updatePayload.rcExpiry = new Date(rcExpiry);

    if (insurancePolicyNumber) updatePayload.insurancePolicyNumber = insurancePolicyNumber.trim();
    if (insuranceExpiry) updatePayload.insuranceExpiry = new Date(insuranceExpiry);
    if (insuranceType) updatePayload.insuranceType = insuranceType;

    if (pucExpiry) updatePayload.pucExpiry = new Date(pucExpiry);
    if (fitnessExpiry) updatePayload.fitnessExpiry = new Date(fitnessExpiry);

    if (permitNumber) updatePayload.permitNumber = permitNumber.trim();
    if (permitExpiry) updatePayload.permitExpiry = new Date(permitExpiry);

    if (panNumber) updatePayload.panNumber = panNumber.trim().toUpperCase();
    if (aadhaarMaskedNumber) updatePayload.aadhaarMaskedNumber = aadhaarMaskedNumber.trim();

    if (policeVerificationCertificateNo) {
      updatePayload.policeVerificationCertificateNo = policeVerificationCertificateNo.trim();
      updatePayload.policeVerificationDate = new Date();
    }

    /* ========= CLOUDINARY UPLOADS ========= */
    if (aadhaar) {
      const url = await uploadOnCloudinary(aadhaar);
      if (!url) return NextResponse.json({ message: "Aadhaar upload failed" }, { status: 500 });
      updatePayload.aadhaarUrl = url;
    }

    if (license) {
      const url = await uploadOnCloudinary(license);
      if (!url) return NextResponse.json({ message: "License upload failed" }, { status: 500 });
      updatePayload.licenseUrl = url;
      updatePayload.licenseStatus = "pending";
    }

    if (rc) {
      const url = await uploadOnCloudinary(rc);
      if (!url) return NextResponse.json({ message: "RC upload failed" }, { status: 500 });
      updatePayload.rcUrl = url;
      updatePayload.rcStatus = "pending";
    }

    if (insurance) {
      const url = await uploadOnCloudinary(insurance);
      if (!url) return NextResponse.json({ message: "Insurance upload failed" }, { status: 500 });
      updatePayload.insuranceUrl = url;
      updatePayload.insuranceStatus = "pending";
    }

    if (puc) {
      const url = await uploadOnCloudinary(puc);
      if (!url) return NextResponse.json({ message: "PUC upload failed" }, { status: 500 });
      updatePayload.pucUrl = url;
      updatePayload.pucStatus = "pending";
    }

    if (fitness) {
      const url = await uploadOnCloudinary(fitness);
      if (!url) return NextResponse.json({ message: "Fitness certificate upload failed" }, { status: 500 });
      updatePayload.fitnessUrl = url;
      updatePayload.fitnessStatus = "pending";
    }

    if (permit) {
      const url = await uploadOnCloudinary(permit);
      if (!url) return NextResponse.json({ message: "Permit upload failed" }, { status: 500 });
      updatePayload.permitUrl = url;
      updatePayload.permitStatus = "pending";
    }

    if (pan) {
      const url = await uploadOnCloudinary(pan);
      if (!url) return NextResponse.json({ message: "PAN upload failed" }, { status: 500 });
      updatePayload.panUrl = url;
      updatePayload.panStatus = "pending";
    }

    if (policeVerification) {
      const url = await uploadOnCloudinary(policeVerification);
      if (!url) return NextResponse.json({ message: "Police verification upload failed" }, { status: 500 });
      updatePayload.policeVerificationUrl = url;
      updatePayload.policeVerificationStatus = "pending";
    }

    /* ========= UPSERT DOCUMENT RECORD ========= */
    await VehicleDocument.findOneAndUpdate(
      { owner: user._id },
      { $set: updatePayload },
      { upsert: true, new: true }
    );

    /* ========= UPDATE DRIVER VERIFICATION STATUS ========= */
    if (!user.driverVerificationStatus) {
      user.driverVerificationStatus = {
        identity: "not_submitted",
        drivingLicense: "not_submitted",
        face: "not_submitted",
        background: "not_submitted",
        address: "not_submitted",
        bank: "not_submitted",
        vehicle: "not_submitted",
      };
    }

    if (license || licenseNumber) {
      user.driverVerificationStatus.drivingLicense = "pending";
    }

    if (aadhaar || pan || panNumber) {
      user.driverVerificationStatus.identity = "pending";
    }

    if (rc || insurance || rcNumber || insurancePolicyNumber) {
      user.driverVerificationStatus.vehicle = "pending";
    }

    if (policeVerification || policeVerificationCertificateNo) {
      user.driverVerificationStatus.background = "pending";
    }

    user.vendorOnboardingStep = Math.max(user.vendorOnboardingStep || 0, 2);
    user.vendorStatus = "pending";
    user.markModified("driverVerificationStatus");
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Documents and vehicle compliance details submitted successfully",
      driverVerificationStatus: user.driverVerificationStatus,
    });
  } catch (error) {
    console.error("POST DOCUMENT ERROR:", error);
    return NextResponse.json(
      { message: "Document upload failed" },
      { status: 500 }
    );
  }
}
