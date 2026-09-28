import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";

export async function GET(req: NextRequest) {
  try {
    await connectDb();

    const url = new URL(req.url);
    const lat = url.searchParams.get("lat") ? Number(url.searchParams.get("lat")) : null;
    const lng = url.searchParams.get("lng") ? Number(url.searchParams.get("lng")) : null;

    const allUsers = await User.find({}).select("name email role isOnline location vendorStatus vendorOnboardingStep").lean();
    const allVehicles = await Vehicle.find({}).lean();

    const vendorsWithDistance = allUsers
      .filter((u) => u.role === "vendor")
      .map((vendor) => {
        let distanceKm = null;
        if (lat !== null && lng !== null && vendor.location?.coordinates) {
          const [vLng, vLat] = vendor.location.coordinates;
          const R = 6371; // Earth radius in km
          const dLat = ((vLat - lat) * Math.PI) / 180;
          const dLon = ((vLng - lng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat * Math.PI) / 180) *
              Math.cos((vLat * Math.PI) / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          distanceKm = R * c;
        }

        const vendorVehicles = allVehicles.filter(
          (v) => v.owner.toString() === vendor._id.toString()
        );

        return {
          id: vendor._id,
          name: vendor.name,
          email: vendor.email,
          isOnline: vendor.isOnline,
          location: vendor.location,
          vendorStatus: vendor.vendorStatus,
          vendorOnboardingStep: vendor.vendorOnboardingStep,
          distanceKm: distanceKm !== null ? Number(distanceKm.toFixed(3)) : null,
          vehicles: vendorVehicles.map((v) => ({
            id: v._id,
            type: v.type,
            number: v.number,
            vehicleModel: v.vehicleModel,
            status: v.status,
            isActive: v.isActive,
          })),
        };
      });

    return NextResponse.json({
      success: true,
      totalUsers: allUsers.length,
      totalVehicles: allVehicles.length,
      vendors: vendorsWithDistance,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}
