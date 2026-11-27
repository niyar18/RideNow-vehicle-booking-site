import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import { recordAuditLog } from "@/lib/auditLogger";
import { sendPushToUser } from "@/lib/webPush";
import { emitSocketEvent } from "@/lib/socketServerEmit";
import { randomUUID } from "node:crypto";

export async function reviewStudent(req: NextRequest, id: string, decision: "verified" | "rejected") {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  if (!Types.ObjectId.isValid(id)) return NextResponse.json({ message: "Invalid student application." }, { status: 400 });
  const body = await req.json().catch(() => null);
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 8 || reason.length > 240) return NextResponse.json({ message: "Enter a reason of 8 to 240 characters." }, { status: 400 });
  try {
    await connectDb();
    const match = { _id: id, "studentVerification.status": "pending" };
    const pending = await User.findOne(match).select("studentVerification.eduEmail studentVerification.institutionName studentVerification.submittedAt").lean() as {
      studentVerification?: { eduEmail?: string; institutionName?: string; submittedAt?: Date };
    } | null;
    if (!pending?.studentVerification) return NextResponse.json({ message: "This application is no longer pending. Refresh the queue." }, { status: 409 });
    const verified = decision === "verified";
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const latest = await User.findOneAndUpdate(
      { ...match, "studentVerification.submittedAt": pending.studentVerification.submittedAt ?? { $exists: false } },
      verified ? {
        $set: {
          isStudent: true, "studentVerification.status": decision, "studentVerification.verifiedAt": now,
          "studentVerification.expiresAt": expiresAt, "studentVerification.verificationReference": `RN-STU-ADM-${randomUUID()}`,
          studentDetails: { eduEmail: pending.studentVerification.eduEmail, institution: pending.studentVerification.institutionName, verifiedAt: now, expiresAt },
        },
        $unset: { "studentVerification.rejectionReason": 1 },
      } : { $set: { isStudent: false, "studentVerification.status": decision, "studentVerification.rejectionReason": reason } },
      { returnDocument: "after", runValidators: true },
    ).select("_id");
    if (!latest) return NextResponse.json({ message: "This application changed. Refresh the queue before proceeding." }, { status: 409 });
    const audit = await recordAuditLog({
      adminId: session.user.id, adminEmail: session.user.email ?? undefined,
      action: verified ? "APPROVE_STUDENT" : "REJECT_STUDENT", targetId: id, targetType: "USER", reason,
      beforeState: { status: "pending" }, afterState: { status: decision }, req,
    });
    await Promise.allSettled([
      emitSocketEvent({ userId: id, event: "student-status-updated", data: verified ? { isStudent: true, status: decision, expiresAt } : { isStudent: false, status: decision, rejectionReason: reason } }),
      sendPushToUser(id, {
        title: verified ? "Student pass approved" : "Student verification update",
        body: verified ? "Your student status is verified. Student pricing applies to eligible rides." : `Your student verification was not approved: ${reason}`,
        url: "/profile", tag: "student-review",
      }),
    ]);
    return NextResponse.json({ success: true, auditRecorded: Boolean(audit) });
  } catch (error) {
    console.error("Student application review failed", error);
    return NextResponse.json({ message: "Couldn’t save the student decision." }, { status: 500 });
  }
}
