import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { NextRequest, NextResponse } from "next/server";


const VEHICLE_REGEX =
  /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,2}[0-9]{4}$/;

export async function POST(req: NextRequest) {
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

    /* ---------- BLOCKED ---------- */
    if (user.isVendorBlocked) {
      return NextResponse.json(
        { message: "Vendor account blocked" },
        { status: 403 }
      );
    }

    /* ---------- BODY ---------- */
    const { type, number, vehicleModel } = await req.json();

    if (!type || !number || !vehicleModel) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!VEHICLE_REGEX.test(number)) {
      return NextResponse.json(
        { message: "Invalid vehicle number format" },
        { status: 400 }
      );
    }

    const vehicleNumber = number.toUpperCase();

    /* ---------- FIND EXISTING VEHICLE (OWNER BASED) ---------- */
    let vehicle = await Vehicle.findOne({ owner: user._id });

    if (vehicle) {
      /* ===== UPDATE MODE ===== */
      vehicle.type = type;
      vehicle.number = vehicleNumber;
      vehicle.vehicleModel = vehicleModel;
      vehicle.status = "pending"; // re-verify
      await vehicle.save();

      return NextResponse.json({
        message: "Vehicle details updated",
        vehicleId: vehicle._id,
        updated: true,
        nextStep: "/partner/onboard/documents",
      });
    }

    /* ---------- DUPLICATE NUMBER CHECK (OTHER USERS) ---------- */
    const duplicate = await Vehicle.findOne({
      number: vehicleNumber,
    });

    if (duplicate) {
      return NextResponse.json(
        { message: "Vehicle already registered" },
        { status: 409 }
      );
    }

    /* ===== CREATE MODE ===== */
    vehicle = await Vehicle.create({
      owner: user._id,
      type,
      number: vehicleNumber,
      vehicleModel,
      status: "pending",
      isActive: true,
    });

    /* ---------- UPDATE USER ---------- */
    user.role = "vendor";
    user.vendorStatus = "pending";

    // step sirf pehli baar badhao
    if (user.vendorOnboardingStep < 1) {
      user.vendorOnboardingStep = 1;
    }

    await user.save();

    return NextResponse.json({
      message: "Vehicle registered successfully",
      vehicleId: vehicle._id,
      created: true,
      nextStep: "/partner/onboard/documents",
    });
  } catch (error) {
    console.error("VEHICLE STEP ERROR:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}




export async function GET() {
  try {
    await connectDb();

    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { authorized: false },
        { status: 401 }
      );
    }

    /* ---------- USER ---------- */
    const user = await User.findOne(
      { email: session.user.email },
      {
        role: 1,
        vendorStatus: 1,
        vendorOnboardingStep: 1,
      }
    );

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    /* ---------- VEHICLE ---------- */
    const vehicle = await Vehicle.findOne({ owner: user._id })
      .select("type number vehicleModel status")
      .lean();

    return NextResponse.json({
      authorized: true,
      user,
      vehicle: vehicle
        ? {
            type: vehicle.type,
            number: vehicle.number,
            model: vehicle.vehicleModel,
            status: vehicle.status,
          }
        : null,
    });
  } catch (error) {
    console.error("GET VEHICLE ERROR:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

