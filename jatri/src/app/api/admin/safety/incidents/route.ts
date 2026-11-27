import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/db";
import SafetyIncident from "@/models/safetyIncident.model";
import { recordAuditLog } from "@/lib/auditLogger";
import { resolveSafetyIncident } from "@/lib/safetyEngine";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
    }

    await connectDb();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");
    const limit = Math.min(100, Math.max(1, (parseInt(searchParams.get("limit") || "50") || 50)));

    const query: any = {};
    if (status && ["active", "investigating", "resolved", "false_alarm"].includes(status)) {
      query.status = status;
    }
    if (severity && ["low", "medium", "high", "critical"].includes(severity)) {
      query.severity = severity;
    }

    const incidents = await SafetyIncident.find(query)
      .select("incidentId booking reporter type severity status description createdAt resolvedAt")
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate({
        path: "booking",
        select: "status isPanicActive",
      })
      .populate({
        path: "reporter",
        select: "name role",
      })
      .populate({
        path: "resolvedBy",
        select: "name email",
      })
      .lean();

    const counts = {
      active: await SafetyIncident.countDocuments({ status: "active" }),
      investigating: await SafetyIncident.countDocuments({ status: "investigating" }),
      critical: await SafetyIncident.countDocuments({ severity: "critical", status: "active" }),
      resolved: await SafetyIncident.countDocuments({ status: "resolved" }),
    };

    return NextResponse.json({
      success: true,
      incidents,
      counts,
    });
  } catch (error: any) {
    console.error("GET /api/admin/safety/incidents error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch safety incidents" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
    }

    await connectDb();
    const { incidentId, status, resolutionNotes } = await req.json();

    if (!incidentId || !status || !resolutionNotes) {
      return NextResponse.json(
        { error: "incidentId, status ('resolved' | 'false_alarm'), and resolutionNotes are required" },
        { status: 400 }
      );
    }

    if (status !== "resolved" && status !== "false_alarm") {
      return NextResponse.json(
        { error: "status must be either 'resolved' or 'false_alarm'" },
        { status: 400 }
      );
    }

    const result = await resolveSafetyIncident({
      incidentId,
      adminId: session.user.id,
      resolutionStatus: status,
      resolutionNotes,
    });

    return NextResponse.json({
      success: true,
      message: `Safety incident marked as ${status}.`,
      incident: result.incident,
    });
  } catch (error: any) {
    console.error("POST /api/admin/safety/incidents error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to resolve safety incident" },
      { status: 400 }
    );
  }
}


/** Claim an active report for investigation without changing its booking or SOS flag. */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  const body = await req.json().catch(() => null);
  const { incidentId, reason: rawReason } = body || {};
  const reason = typeof rawReason === "string" ? rawReason.trim() : "";
  if (typeof incidentId !== "string" || !incidentId.trim() || incidentId.length > 100 || reason.length < 8 || reason.length > 240) {
    return NextResponse.json({ message: "Select an incident and enter a reason of 8 to 240 characters." }, { status: 400 });
  }
  try {
    await connectDb();
    const updated = await SafetyIncident.findOneAndUpdate(
      { incidentId, status: "active" }, { $set: { status: "investigating" } }, { returnDocument: "after", runValidators: true },
    ).select("_id");
    if (!updated) return NextResponse.json({ message: "The incident is no longer active. Refresh the queue." }, { status: 409 });
    const audit = await recordAuditLog({
      adminId: session.user.id, adminEmail: session.user.email ?? undefined,
      action: "INVESTIGATE_INCIDENT", targetType: "SAFETY_INCIDENT", targetId: incidentId, reason,
      beforeState: { status: "active" }, afterState: { status: "investigating" }, req,
    });
    return NextResponse.json({ success: true, auditRecorded: Boolean(audit) });
  } catch (error) {
    console.error("Admin incident triage failed", error);
    return NextResponse.json({ message: "Couldn’t update the incident." }, { status: 500 });
  }
}
