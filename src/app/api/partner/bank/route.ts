import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/db";

import User from "@/models/user.model";
import PartnerBank from "@/models/partnerBank.model";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, account, ifsc, upi, mobileNumber } = body;

    if (!name || !account || !ifsc) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    await connectDb();

    // 🔁 UPSERT bank details
    await PartnerBank.findOneAndUpdate(
      { owner: session.user.id },
      {
        accountHolderName: name,
        accountNumber: account,
        ifsc,
        upi,
        status: "details_added",
      },
      { upsert: true, new: true }
    );

    // 🔥 UPDATE USER STEP AND MOBILE NUMBER
    const updateData: any = {
      vendorOnboardingStep: 3,
      vendorStatus:"pending"
    };

    // Only update mobile number if provided
    if (mobileNumber) {
      updateData.mobileNumber = mobileNumber;
    }

    await User.findByIdAndUpdate(session.user.id, updateData);

    return NextResponse.json({
      success: true,
      message: "Bank details saved",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}


export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDb();

    const bank = await PartnerBank.findOne({
      owner: session.user.id,
    });

    return NextResponse.json({ bank });
  } catch {
    return NextResponse.json(
      { message: "Error" },
      { status: 500 }
    );
  }
}