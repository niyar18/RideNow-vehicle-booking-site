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

    return NextResponse.json({
      success: true,
      documents: documents || null,
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

    const aadhaar = formData.get("aadhaar") as Blob | null;
    const license = formData.get("license") as Blob | null;
    const rc = formData.get("rc") as Blob | null;

    if (!aadhaar && !license && !rc) {
      return NextResponse.json(
        { message: "No documents provided" },
        { status: 400 }
      );
    }

    const updatePayload: any = {
      status: "pending",
      rejectionReason: null,
    };

    /* ========= CLOUDINARY UPLOAD ========= */

    if (aadhaar) {
      const url = await uploadOnCloudinary(aadhaar);
      if (!url)
        return NextResponse.json(
          { message: "Aadhaar upload failed" },
          { status: 500 }
        );
      updatePayload.aadhaarUrl = url;
    }

    if (license) {
      const url = await uploadOnCloudinary(license);
      if (!url)
        return NextResponse.json(
          { message: "License upload failed" },
          { status: 500 }
        );
      updatePayload.licenseUrl = url;
    }

    if (rc) {
      const url = await uploadOnCloudinary(rc);
      if (!url)
        return NextResponse.json(
          { message: "RC upload failed" },
          { status: 500 }
        );
      updatePayload.rcUrl = url;
    }

    /* ========= UPSERT DOCUMENT ========= */

    await VehicleDocument.findOneAndUpdate(
      { owner: user._id },
      { $set: updatePayload },
      { upsert: true, new: true }
    );

    /* ========= UPDATE USER ONBOARDING ========= */

    user.vendorOnboardingStep = Math.max(
      user.vendorOnboardingStep || 0,
      2 // documents step completed
    );

    user.vendorStatus = "pending";
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Documents submitted successfully",
    });
  } catch (error) {
    console.error("POST DOCUMENT ERROR:", error);
    return NextResponse.json(
      { message: "Document upload failed" },
      { status: 500 }
    );
  }
}
