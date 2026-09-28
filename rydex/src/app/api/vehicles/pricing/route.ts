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
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    let configs = await FareConfig.find({});
    
    // Auto-seed fallback if empty
    if (!configs.length) {
      await FareConfig.insertMany(DEFAULT_RATES);
      configs = await FareConfig.find({});
    }

    // Convert into a structured key-value map for quick frontend lookup
    const ratesMap: Record<string, { baseFare: number; pricePerKm: number; pricePerMinute: number; multiplier: number; minDistance: number; maxDistance: number }> = {};
    configs.forEach((c) => {
      ratesMap[c.vehicleType.toLowerCase()] = {
        baseFare: c.baseFare,
        pricePerKm: c.pricePerKm,
        pricePerMinute: c.pricePerMinute,
        multiplier: c.multiplier,
        minDistance: c.minDistance !== undefined ? c.minDistance : 0,
        maxDistance: c.maxDistance !== undefined ? c.maxDistance : 9999,
      };
    });

    return NextResponse.json({ success: true, rates: ratesMap });
  } catch (error) {
    console.error("PUBLIC GET PRICING ERROR:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
