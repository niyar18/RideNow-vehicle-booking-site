import { auth } from "@/auth";
import uploadOnCloudinary from "@/lib/cloudinary";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    await connectDb();

    /* ---------- AUTH ---------- */
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    /* ---------- VEHICLE ---------- */
    const vehicle = await Vehicle.findOne({ owner: user._id });
    if (!vehicle) {
      return NextResponse.json(
        { message: "Vehicle not found" },
        { status: 404 }
      );
    }

    /* ---------- FORM DATA ---------- */
    const formData = await req.formData();

    const image = formData.get("image") as File | null;
    const baseFare = formData.get("baseFare");
    const pricePerKm = formData.get("pricePerKm");
    const waitingCharge = formData.get("waitingCharge");

    let updated = false;

    /* ---------- IMAGE UPDATE (OPTIONAL) ---------- */
    if (image && image.size > 0) {
      const imageUrl = await uploadOnCloudinary(image);
      vehicle.imageUrl = imageUrl;
      updated = true;
    }

    /* ---------- PRICING UPDATE ---------- */
    if (baseFare !== null) {
      vehicle.baseFare = Number(baseFare);
      updated = true;
    }

    if (pricePerKm !== null) {
      vehicle.pricePerKm = Number(pricePerKm);
      updated = true;
    }

    if (waitingCharge !== null) {
      vehicle.waitingCharge = Number(waitingCharge);
      updated = true;
    }

    if (!updated) {
      return NextResponse.json(
        { message: "Nothing to update" },
        { status: 400 }
      );
    }

    /* ---------- SEND BACK TO REVIEW ---------- */
    vehicle.status = "pending";
    vehicle.rejectionReason = undefined;

    await vehicle.save();

    /* ---------- MOVE STEP IF NEEDED ---------- */
   
      user.vendorOnboardingStep = 6;
      await user.save();
   

    return NextResponse.json({
      message: "Pricing submitted for admin review",
      status: vehicle.status,
    });
  } catch (error) {
    console.error("PRICING ERROR:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}



export async function GET() {
  try {
    await connectDb();

    /* ---------- AUTH ---------- */
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    /* ---------- VEHICLE ---------- */
    const vehicle = await Vehicle.findOne({ owner: user._id });

    if (!vehicle) {
      return NextResponse.json(
        { message: "Vehicle not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      pricing: {
        imageUrl: vehicle.imageUrl || null,
        baseFare: vehicle.baseFare || null,
        pricePerKm: vehicle.pricePerKm || null,
        waitingCharge: vehicle.waitingCharge || 0,
        status: vehicle.status,
        rejectionReason: vehicle.rejectionReason || null,
      },
    });
  } catch (error) {
    console.error("GET PRICING ERROR:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
