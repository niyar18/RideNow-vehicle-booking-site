import { auth } from "@/auth";
import uploadOnCloudinary from "@/lib/cloudinary";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  try {
    await connectDb();

    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const vehicle = await Vehicle.findOne({ owner: user._id });
    if (!vehicle) {
      return NextResponse.json({ message: "Vehicle not found" }, { status: 404 });
    }

    const formData = await req.formData();

    const image = formData.get("image") as File | null;
    const baseFare = formData.get("baseFare");
    const pricePerKm = formData.get("pricePerKm");
    const waitingCharge = formData.get("waitingCharge");

    let updated = false;

    // 🔁 OPTIONAL IMAGE UPDATE
    if (image && image.size > 0) {
      vehicle.imageUrl = await uploadOnCloudinary(image);
      updated = true;
    }

    // 🔁 OPTIONAL PRICING UPDATE
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

    // 🔥 ONLY VEHICLE GOES BACK TO REVIEW
    vehicle.status = "pending";
    vehicle.rejectionReason = undefined;

    await vehicle.save();

    return NextResponse.json({
      message: "Pricing updated, sent for admin review",
      vehicleStatus: vehicle.status,
    });
  } catch (err) {
    console.error("PRICING EDIT ERROR:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
