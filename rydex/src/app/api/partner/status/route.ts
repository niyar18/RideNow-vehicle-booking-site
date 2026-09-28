import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectDb();
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findById(session.user.id).select("isOnline location");
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      isOnline: user.isOnline,
      location: user.location,
    });
  } catch (error) {
    console.error("Partner status GET error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await connectDb();
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { isOnline, latitude, longitude } = await req.json();
    const updateData: any = {};
    if (typeof isOnline === "boolean") {
      updateData.isOnline = isOnline;
    }
    if (typeof latitude === "number" && typeof longitude === "number") {
      updateData.location = {
        type: "Point",
        coordinates: [longitude, latitude], // [lng, lat]
      };
      updateData.lastLocationUpdate = new Date();
    }

    const user = await User.findByIdAndUpdate(
      session.user.id,
      updateData,
      { new: true }
    ).select("isOnline location");

    return NextResponse.json({
      success: true,
      isOnline: user.isOnline,
      location: user.location,
    });
  } catch (error) {
    console.error("Partner status PATCH error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
