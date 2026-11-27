export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/db";
import FareConfig from "@/models/fareConfig.model";
import { recordAuditLog } from "@/lib/auditLogger";
import { mergeFareRates, normalizeFareVehicle } from "@/lib/farePolicy";
import { validateAdminFareChange } from "@/lib/adminFareEditing";

const conflict = () => NextResponse.json({ message: "Rates changed since you opened this editor. Reload before saving." }, { status: 409 });

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  try {
    await connectDb();
    const rows = await FareConfig.find({}).lean() as unknown as Array<Record<string, unknown> & { updatedAt?: Date }>;
    return NextResponse.json({
      success: true,
      configs: Object.entries(mergeFareRates(rows)).map(([vehicleType, rate]) => ({
        ...rate, vehicleType, version: rows.find((row) => row.vehicleType === vehicleType)?.updatedAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    console.error("Admin fare read failed", error);
    return NextResponse.json({ message: "Couldn’t load fare rules." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  try {
    const input = await req.json().catch(() => null);
    if (!input || typeof input !== "object") return NextResponse.json({ message: "Enter a valid fare change." }, { status: 400 });
    const vehicleType = normalizeFareVehicle(input.vehicleType);
    await connectDb();
    const previous = await FareConfig.findOne({ vehicleType });
    const before = mergeFareRates(previous ? [previous.toObject()] : [])[vehicleType];
    let update;
    try { update = validateAdminFareChange(input, before); }
    catch (error) { return NextResponse.json({ message: (error as Error).message }, { status: 400 }); }
    if ((previous?.updatedAt?.toISOString() ?? null) !== update.version) return conflict();

    const config = previous
      ? await FareConfig.findOneAndUpdate(
        { _id: previous._id, updatedAt: previous.updatedAt ?? { $exists: false } },
        { $set: update.patch }, { returnDocument: "after", runValidators: true },
      )
      : await FareConfig.create({ vehicleType, ...update.rate });
    if (!config) return conflict();
    const audit = await recordAuditLog({
      adminId: session.user.id, adminEmail: session.user.email ?? undefined,
      action: "UPDATE_FARE", targetId: vehicleType, targetType: "PRICING",
      reason: update.reason,
      beforeState: Object.fromEntries(Object.keys(update.patch).map((key) => [key, before[key as keyof typeof before]])),
      afterState: update.patch, req,
    });
    return NextResponse.json({
      success: true,
      config: { ...update.rate, vehicleType, version: config.updatedAt?.toISOString() ?? null },
      auditRecorded: Boolean(audit),
    });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === 11000) return conflict();
    console.error("Admin fare update failed", error);
    return NextResponse.json({ message: "Couldn’t save fare rules." }, { status: 500 });
  }
}
