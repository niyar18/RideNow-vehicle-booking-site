import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { auth } from "@/auth";
import axios from "axios";

function haversineDistance(coords1: [number, number], coords2: [number, number]) {
  const [lon1, lat1] = coords1;
  const [lon2, lat2] = coords2;
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

export async function POST(req: Request) {
  await connectDb();

  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const {
    pickup,
    drop,
    vehicle, // requested vehicle type: bike, auto, car, loading, truck
    fare,
    mobileNumber, // user's mobile number
    pickupLat,
    pickupLng,
    dropLat,
    dropLng,
  } = body;

  if (
    !pickup ||
    !drop ||
    !vehicle ||
    pickupLat === undefined ||
    pickupLng === undefined ||
    dropLat === undefined ||
    dropLng === undefined
  ) {
    return NextResponse.json(
      { message: "Missing required fields" },
      { status: 400 }
    );
  }

  // Prevent duplicate active booking
  const existing = await Booking.findOne({
    user: session.user.id,
    status: {
      $in: ["requested", "awaiting_payment", "confirmed", "started"],
    },
  });

  if (existing) {
    return NextResponse.json({ success: true, booking: existing });
  }

  // 1️⃣ Find all vehicles of this type
  const activeVehicles = await Vehicle.find({
    type: vehicle,
  }).lean();

  if (!activeVehicles.length) {
    return NextResponse.json(
      { message: "No vehicles of this category are registered" },
      { status: 404 }
    );
  }

  const vehicleOwnerIds = activeVehicles.map(v => v.owner.toString());

  // 2️⃣ Query online vendors who own these vehicles, within 15km (Try $near first, fallback to $geoWithin)
  let vendors = [];
  try {
    vendors = await User.find({
      _id: { $in: vehicleOwnerIds },
      role: "vendor",
      isOnline: true,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [Number(pickupLng), Number(pickupLat)], // [lng, lat]
          },
          $maxDistance: 15000, // 15km
        },
      },
    }).lean();
  } catch (geoError) {
    console.warn("Geospatial index matching query failed in booking creation, falling back to $geoWithin:", geoError);
    vendors = await User.find({
      _id: { $in: vehicleOwnerIds },
      role: "vendor",
      isOnline: true,
      location: {
        $geoWithin: {
          $centerSphere: [
            [Number(pickupLng), Number(pickupLat)],
            15 / 6378.1 // 15km in radians
          ]
        }
      }
    }).lean();
  }

  if (!vendors.length) {
    return NextResponse.json(
      { message: "No drivers available nearby (15km limit)" },
      { status: 404 }
    );
  }

  // 3️⃣ Compute Haversine distance, and sort them explicitly
  const sortedCandidates = vendors.map(v => {
    const coords: [number, number] = v.location?.coordinates || [0, 0];
    const distance = haversineDistance([Number(pickupLng), Number(pickupLat)], coords);
    return { ...v, distance };
  }).sort((a, b) => a.distance - b.distance);

  const nearestVendor = sortedCandidates[0];
  const nearestVehicle = activeVehicles.find(v => v.owner.toString() === nearestVendor._id.toString());

  const booking = await Booking.create({
    user: session.user.id,
    driver: nearestVendor._id,
    vehicle: nearestVehicle?._id,
    pickupAddress: pickup,
    dropAddress: drop,
    pickupLocation: {
      type: "Point",
      coordinates: [Number(pickupLng), Number(pickupLat)],
    },
    dropLocation: {
      type: "Point",
      coordinates: [Number(dropLng), Number(dropLat)],
    },
    fare,
    adminCommission: Number((fare * 0.10).toFixed(2)),
    partnerAmount: Number((fare - (fare * 0.10)).toFixed(2)),
    userMobileNumber: mobileNumber,
    driverMobileNumber: nearestVendor.mobileNumber || "",
    candidateDrivers: sortedCandidates.map(c => c._id),
    currentDriverIndex: 0,
    status: "requested",
  });

  // 4️⃣ Emit booking request to nearest driver
  try {
    await axios.post(
      `${process.env.NEXT_PUBLIC_SOCKET_SERVER}/emit`,
      {
        userId: nearestVendor._id.toString(),
        event: "new-booking",
        data: booking,
      }
    );
  } catch (err) {
    console.error("Socket emission error:", err);
  }

  return NextResponse.json({ success: true, booking });
}