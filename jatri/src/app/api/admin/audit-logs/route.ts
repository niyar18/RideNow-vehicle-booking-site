export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/db";
import AuditLog from "@/models/auditLog.model";

/**
 * GET /api/admin/audit-logs
 * Retrieves immutable administrative activity logs with multi-parameter filtering.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user?.id || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized admin access" },
        { status: 403 }
      );
    }

    await connectDb();
    const { searchParams } = new URL(req.url);
    const targetId = searchParams.get("targetId");
    const targetType = searchParams.get("targetType");
    const action = searchParams.get("action");
    const adminId = searchParams.get("adminId");

    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};

    if (targetId) {
      query.targetId = targetId;
    }
    if (targetType) {
      query.targetType = targetType.toUpperCase();
    }
    if (action) {
      query.action = action.toUpperCase();
    }
    if (adminId) {
      query.admin = adminId;
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .select("action targetId targetType admin beforeState afterState reason createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "admin",
          select: "name",
        })
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("GET /api/admin/audit-logs error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
