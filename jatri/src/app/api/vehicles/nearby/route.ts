import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { haversineKm as getDistance } from "@/lib/routeUtils";
import { redisGet, redisSet } from "@/lib/redis";

async function queryNearbyVehicles(
  latitude: number,
  longitude: number,
  vehicleType?: string
) {
  // High-speed Upstash Redis cache lookup (8s TTL for live driver positions)
  const cacheKey = `nearby_v2_${latitude.toFixed(3)}_${longitude.toFixed(3)}_${vehicleType || "all"}`;
  const cachedVehicles = await redisGet<any[]>(cacheKey);
  if (cachedVehicles) {
    return { vehicles: cachedVehicles, cached: true };
  }

  const conn = await connectDb();
  if (!conn || mongoose.connection.readyState !== 1) {
    return { vehicles: [], cached: false };
  }

  // 1. Find nearby vendors within strictly 10km limit
  let vendors: any[] = [];
  try {
    vendors = await User.find({
      role: "vendor",
      isOnline: true,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          $maxDistance: 10000, // strictly 10km max
        },
      },
    })
      .select("_id location")
      .lean();
  } catch (geoError) {
    console.warn("2dsphere query fallback in nearby vehicles:", geoError);
    try {
      vendors = await User.find({
        role: "vendor",
        isOnline: true,
        location: {
          $geoWithin: {
            $centerSphere: [
              [longitude, latitude],
              10 / 6378.1, // strictly 10km in radians
            ],
          },
        },
      })
        .select("_id location")
        .lean();
    } catch (fallbackErr) {
      console.warn("geoWithin query also failed:", fallbackErr);
      return { vehicles: [], cached: false };
    }
  }

  const vendorIds = vendors.map((v) => v._id);
  if (!vendorIds.length) {
    return { vehicles: [], cached: false };
  }

  const vendorMap = new Map(vendors.map((v) => [v._id.toString(), v.location]));

  // 2. Get vehicles of those vendors with privacy protection:
  // Strip driver personal identifiers (owner ID, license plate) & fuzz coordinates (~50-80m)
  const vehicles = await Vehicle.find({
    owner: { $in: vendorIds },
    ...(vehicleType && { type: vehicleType }),
  })
    .select("type _id owner")
    .lean();

  const sanitizedVehicles = vehicles
    .map((v) => {
      const loc = vendorMap.get(v.owner.toString()) || null;
      let distanceKm = null;
      let sanitizedCoords: [number, number] | null = null;

      if (loc?.coordinates && loc.coordinates.length >= 2) {
        const rawLng = loc.coordinates[0];
        const rawLat = loc.coordinates[1];
        distanceKm = getDistance(latitude, longitude, rawLat, rawLng);

        // Deterministic pseudo-jitter based on vehicle ID (~50-70m offset)
        const hashSeed =
          (v._id.toString().charCodeAt(v._id.toString().length - 1) % 7) - 3;
        const jitterLat = hashSeed * 0.00018;
        const jitterLng = hashSeed * 0.00018;

        sanitizedCoords = [
          Number((rawLng + jitterLng).toFixed(4)),
          Number((rawLat + jitterLat).toFixed(4)),
        ];
      }

      return {
        _id: `v_anon_${v._id.toString().slice(-6)}`,
        type: v.type,
        distance: distanceKm !== null ? Number(distanceKm.toFixed(2)) : null,
        location: sanitizedCoords
          ? {
              type: "Point",
              coordinates: sanitizedCoords,
            }
          : null,
      };
    })
    .filter((v) => v.distance !== null && v.distance <= 10 && v.location !== null);

  // Sort by distance ascending
  sanitizedVehicles.sort((a, b) => {
    if (a.distance === null) return 1;
    if (b.distance === null) return -1;
    return a.distance - b.distance;
  });

  // Cache in Upstash Redis for 8 seconds
  await redisSet(cacheKey, sanitizedVehicles, 8);

  // Return with live women drivers count
  let womenDriversCount = 0;
  try {
    womenDriversCount = await User.countDocuments({
      role: "vendor",
      isOnline: true,
      "safetyMatching.driverCategory": "woman",
      "safetyMatching.driverVerificationStatus": "verified",
      location: {
        $geoWithin: {
          $centerSphere: [[longitude, latitude], 10 / 6378.1],
        },
      },
    });
  } catch (_) {}

  return { vehicles: sanitizedVehicles, womenDriversCount, cached: false };
}

export async function POST(req: NextRequest) {
  try {
    const { latitude, longitude, vehicleType } = await req.json();

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { success: false, message: "Valid coordinates (latitude, longitude) required" },
        { status: 400 }
      );
    }

    const result = await queryNearbyVehicles(lat, lng, vehicleType);
    return NextResponse.json({
      success: true,
      vehicles: result.vehicles,
      cached: result.cached,
      womenDriversCount: (result as any).womenDriversCount || 0,
    });
  } catch (error: any) {
    console.error("NEARBY API ERROR (POST):", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to query nearby vehicles" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawLat = searchParams.get("lat") || searchParams.get("latitude");
    const rawLng = searchParams.get("lng") || searchParams.get("lon") || searchParams.get("longitude");
    const vehicleType = searchParams.get("vehicleType") || searchParams.get("type") || undefined;

    const lat = Number(rawLat);
    const lng = Number(rawLng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { success: false, message: "Valid coordinates (lat, lng) required" },
        { status: 400 }
      );
    }

    const result = await queryNearbyVehicles(lat, lng, vehicleType);
    return NextResponse.json({
      success: true,
      vehicles: result.vehicles,
      cached: result.cached,
      womenDriversCount: (result as any).womenDriversCount || 0,
    });
  } catch (error: any) {
    console.error("NEARBY API ERROR (GET):", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to query nearby vehicles" },
      { status: 500 }
    );
  }
}
