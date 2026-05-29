import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import User from "@/models/user.model";
import connectDb from "@/lib/db";

/* ---------------- POST: VERIFY OTP ---------------- */

export async function POST(req: NextRequest) {
  try {
    await connectDb();

    const body = await req.json();
    const { email, otp } = body;
console.log(otp)
    /* ---------- VALIDATION ---------- */

    if (!email || !otp) {
      return NextResponse.json(
        { message: "Email and OTP are required" },
        { status: 400 }
      );
    }

    /* ---------- FIND USER ---------- */

    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    /* ---------- ALREADY VERIFIED ---------- */

    if (user.isEmailVerified) {
      return NextResponse.json(
        { message: "Email already verified. Please login." },
        { status: 400 }
      );
    }

    /* ---------- OTP MATCH ---------- */

    if (!user.otp || user.otp !== otp) {
      return NextResponse.json(
        { message: "Invalid OTP" },
        { status: 401 }
      );
    }

    /* ---------- OTP EXPIRY ---------- */

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return NextResponse.json(
        { message: "OTP expired. Please request a new one." },
        { status: 410 }
      );
    }

    /* ---------- VERIFY USER ---------- */

    user.isEmailVerified = true;
    user.otp = undefined;
    user.otpExpiresAt = undefined;

    await user.save();

    /* ---------- SUCCESS ---------- */

    return NextResponse.json(
      {
        message: "Email verified successfully",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
