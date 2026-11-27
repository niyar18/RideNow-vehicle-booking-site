export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Withdrawal from "@/models/withdrawal.model";
import { resolveWithdrawal } from "@/lib/walletLedger";
import { recordAuditLog } from "@/lib/auditLogger";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
    }

    await connectDb();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limit = Math.min(100, Math.max(1, (parseInt(searchParams.get("limit") || "50") || 50)));

    const query: any = {};
    if (status && ["pending", "processing", "success", "failed", "reversed"].includes(status)) {
      query.status = status;
    }

    const withdrawals = await Withdrawal.find(query)
      .select("withdrawalId driver amount status createdAt processedAt")
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate({
        path: "driver",
        select: "name",
      })
      .lean();

    const counts = {
      pending: await Withdrawal.countDocuments({ status: "pending" }),
      processing: await Withdrawal.countDocuments({ status: "processing" }),
      success: await Withdrawal.countDocuments({ status: "success" }),
      failed: await Withdrawal.countDocuments({ status: "failed" }),
    };

    return NextResponse.json({
      success: true,
      withdrawals,
      counts,
    });
  } catch (error: any) {
    console.error("GET /api/admin/withdrawals error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch withdrawals" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
    }

    await connectDb();
    const { withdrawalId, action, failureReason } = await req.json();

    if (!withdrawalId || !action) {
      return NextResponse.json(
        { error: "withdrawalId and action ('approve' | 'fail' | 'reverse') are required" },
        { status: 400 }
      );
    }

    let targetStatus: "success" | "failed" | "reversed";
    if (action === "approve" || action === "success") {
      targetStatus = "success";
    } else if (action === "fail" || action === "reject") {
      targetStatus = "failed";
    } else if (action === "reverse") {
      targetStatus = "reversed";
    } else {
      return NextResponse.json(
        { error: "Invalid action. Supported: 'approve', 'fail', 'reverse'" },
        { status: 400 }
      );
    }

    const result = await resolveWithdrawal({
      withdrawalId,
      status: targetStatus,
      failureReason,
      adminId: session.user.id,
    });

    if (!(result as any).alreadySettled) {
      await recordAuditLog({
        adminId: session.user.id,
        adminEmail: session.user.email || undefined,
        action: "PROCESS_WITHDRAWAL",
        targetId: withdrawalId,
        targetType: "WITHDRAWAL",
        reason: failureReason,
        afterState: {
          status: targetStatus,
          processedAt: new Date(),
        },
        metadata: {
          action,
          amount: (result as any).withdrawal?.amount,
          driverId: String((result as any).withdrawal?.driver),
          failureReason,
        },
        req,
      });
    }

    return NextResponse.json({
      success: true,
      message:
        targetStatus === "success"
          ? "Withdrawal marked as successfully settled."
          : `Withdrawal marked as ${targetStatus} and funds were automatically restored to driver's wallet.`,
      result,
    });
  } catch (error: any) {
    console.error("POST /api/admin/withdrawals error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to resolve withdrawal" },
      { status: 400 }
    );
  }
}
