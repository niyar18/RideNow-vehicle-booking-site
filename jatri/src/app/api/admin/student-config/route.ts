export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import { auth } from "@/auth";
import StudentConfig from "@/models/studentConfig.model";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") return NextResponse.json({ message: "Admin access required." }, { status: 403 });
    await connectDb();
    const config = await StudentConfig.findOne({ isActive: true }).lean() ?? {
      discountPercentage: 10, maxDiscountCap: 50, minFare: 100, validityMonths: 12,
      monthlyDiscountCap: 200, maxMonthlyRides: 10, eligibleVehicleTypes: ["bike", "auto", "car"],
      allowStackingWithPromo: false, isActive: true,
    };

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: "Failed to fetch student configuration", error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();

    // Check admin role
    if (!session?.user?.id || (session.user as any)?.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Admin privileges required." },
        { status: 403 }
      );
    }

    await connectDb();
    const body = await req.json();
    const {
      discountPercentage,
      maxDiscountCap,
      minFare,
      validityMonths,
      eligibleVehicleTypes,
      allowStackingWithPromo,
      isActive,
    } = body;

    let config = await StudentConfig.findOne({ isActive: true });
    if (!config) {
      config = new StudentConfig();
    }

    if (discountPercentage !== undefined) config.discountPercentage = Number(discountPercentage);
    if (maxDiscountCap !== undefined) config.maxDiscountCap = Number(maxDiscountCap);
    if (minFare !== undefined) config.minFare = Number(minFare);
    if (validityMonths !== undefined) config.validityMonths = Number(validityMonths);
    if (Array.isArray(eligibleVehicleTypes)) config.eligibleVehicleTypes = eligibleVehicleTypes;
    if (allowStackingWithPromo !== undefined) config.allowStackingWithPromo = Boolean(allowStackingWithPromo);
    if (isActive !== undefined) config.isActive = Boolean(isActive);

    await config.save();

    return NextResponse.json({
      success: true,
      message: "Student Program configuration updated successfully.",
      config,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: "Failed to update student configuration", error: error.message },
      { status: 500 }
    );
  }
}
