import { NextResponse } from "next/server";

import connectDB from "@/lib/db";
import User from "@/models/user.model";

export async function GET() {
  await connectDB();

  const vendors = await User.find({
    role: "vendor",
    videoKycStatus: { $in: ["pending", "in_progress"]},
  });

  return NextResponse.json(vendors);
}
