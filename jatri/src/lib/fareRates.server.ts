import connectDb from "@/lib/db";
import FareConfig from "@/models/fareConfig.model";
import { mergeFareRates } from "@/lib/farePolicy";

/** Public and booking reads use the same tariff, without seeding or modifying persisted prices. */
export async function loadFareRates() {
  await connectDb();
  const rows = await FareConfig.find({}).lean();
  return mergeFareRates(rows as unknown as Record<string, unknown>[]);
}
