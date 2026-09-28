import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/db";

import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";

/* ================================
   GET → ADMIN DASHBOARD DATA
================================ */

export async function GET() {
  try {
    /* ---------- AUTH ---------- */
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDb();

    /* ================================
       STATS
    ================================ */

    const totalVendors = await User.countDocuments({
      role: "vendor",
    });

    const approved = await User.countDocuments({
      role: "vendor",
      vendorStatus: "approved",
    });

    const pending = await User.countDocuments({
      role: "vendor",
      vendorStatus: "pending",
    });

    const rejected = await User.countDocuments({
      role: "vendor",
      vendorStatus: "rejected",
    });

    /* ================================
       PENDING VENDOR REVIEWS
       (Vendor onboarding verification)
    ================================ */

    const pendingVendorUsers = await User.find({
      role: "vendor",
      vendorStatus: "pending",
    })
      .select("name email")
      .lean();

    const vendorIds = pendingVendorUsers.map((v) => v._id);

    const vendorVehicles = await Vehicle.find({
      owner: { $in: vendorIds },
    })
      .select("owner type")
      .lean();

    const vehicleTypeMap = new Map(
      vendorVehicles.map((v) => [
        String(v.owner),
        v.type,
      ])
    );

    const pendingVendors = pendingVendorUsers.map((v) => ({
      _id: v._id,
      name: v.name,
      email: v.email,
      vehicleType:
        vehicleTypeMap.get(String(v._id)) || "—",
    }));

    /* ================================
       PENDING VEHICLE PRICING REVIEWS
       (Pricing + image approval)
    ================================ */

    const pendingVehiclesRaw = await Vehicle.find({
      status: "pending",
      baseFare: { $exists: true },
      pricePerKm: { $exists: true },
    })
      .populate({
        path: "owner",
        select: "name email",
      })
      .lean();

    const pendingVehicles = pendingVehiclesRaw.map(
      (v: any) => ({
        _id: v._id,
        ownerName: v.owner?.name,
        ownerEmail: v.owner?.email,
        vehicleType: v.type,
        baseFare: v.baseFare,
        pricePerKm: v.pricePerKm,
      })
    );

    /* ================================
       RESPONSE
    ================================ */

    return NextResponse.json({
      success: true,
      stats: {
        totalVendors,
        approved,
        pending,
        rejected,
      },
      pendingVendors,
      pendingVehicles,
    });
  } catch (error) {
    console.error("ADMIN DASHBOARD ERROR:", error);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}
