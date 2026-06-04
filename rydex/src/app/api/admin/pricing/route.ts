import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/db";
import FareConfig from "@/models/fareConfig.model";

const DEFAULT_RATES = [
  { vehicleType: "bike",    baseFare: 30,  pricePerKm: 8,   pricePerMinute: 1.5, multiplier: 1.0, minDistance: 0, maxDistance: 15 },
  { vehicleType: "auto",    baseFare: 50,  pricePerKm: 12,  pricePerMinute: 2.0, multiplier: 1.2, minDistance: 0, maxDistance: 30 },
  { vehicleType: "car",     baseFare: 80,  pricePerKm: 18,  pricePerMinute: 3.0, multiplier: 1.5, minDistance: 0, maxDistance: 100 },
  { vehicleType: "loading", baseFare: 120, pricePerKm: 24,  pricePerMinute: 4.0, multiplier: 1.8, minDistance: 0, maxDistance: 150 },
  { vehicleType: "truck",   baseFare: 180, pricePerKm: 30,  pricePerMinute: 5.0, multiplier: 2.2, minDistance: 0, maxDistance: 500 },
];

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    let configs = await FareConfig.find({});
    
    // Auto-seed if empty
    if (!configs.length) {
      await FareConfig.insertMany(DEFAULT_RATES);
      configs = await FareConfig.find({});
    }

    return NextResponse.json({ success: true, configs });
  } catch (error) {
    console.error("ADMIN GET PRICING ERROR:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const body = await req.json();
    const { vehicleType, baseFare, pricePerKm, pricePerMinute, multiplier, minDistance, maxDistance } = body;

    if (
      !vehicleType ||
      baseFare === undefined ||
      pricePerKm === undefined ||
      pricePerMinute === undefined ||
      multiplier === undefined ||
      minDistance === undefined ||
      maxDistance === undefined
    ) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const config = await FareConfig.findOneAndUpdate(
      { vehicleType: vehicleType.toLowerCase() },
      {
        baseFare: Number(baseFare),
        pricePerKm: Number(pricePerKm),
        pricePerMinute: Number(pricePerMinute),
        multiplier: Number(multiplier),
        minDistance: Number(minDistance),
        maxDistance: Number(maxDistance),
      },
      { new: true, upsert: true }
    );

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error("ADMIN POST PRICING ERROR:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
