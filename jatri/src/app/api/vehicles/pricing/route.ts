import { NextResponse } from "next/server";
import { loadFareRates } from "@/lib/fareRates.server";
import { mergeFareRates } from "@/lib/farePolicy";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  try {
    return NextResponse.json({ success: true, rates: await loadFareRates() }, { headers });
  } catch (error) {
    console.warn("Current tariff unavailable; returning estimate-only defaults", error);
    return NextResponse.json({ success: true, estimateOnly: true, rates: mergeFareRates() }, { headers });
  }
}
