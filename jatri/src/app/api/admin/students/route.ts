export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import { auth } from "@/auth";
import User from "@/models/user.model";
import logger from "@/lib/logger";

/**
 * GET /api/admin/students
 * Lists student verification applications with status and pagination filters.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || (session.user as any)?.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Admin privileges required." },
        { status: 403 }
      );
    }

    await connectDb();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "pending";
    const page = Math.max(1, (parseInt(searchParams.get("page") || "1", 10) || 1));
    const limit = Math.min(100, Math.max(1, (parseInt(searchParams.get("limit") || "20", 10) || 20)));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};
    if (status !== "all") {
      query["studentVerification.status"] = status;
    } else {
      query["studentVerification.status"] = { $exists: true, $ne: "not_verified" };
    }

    const [students, total] = await Promise.all([
      User.find(query)
        .select("name studentVerification.status studentVerification.institutionName studentVerification.verificationMethod studentVerification.studentName studentVerification.documentType studentVerification.documentUrl studentVerification.submittedAt studentVerification.rejectionReason")
        .sort({ "studentVerification.submittedAt": -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      students: students.map((student) => {
        const submitted = student.studentVerification;
        if (!submitted?.documentUrl) return student;
        try {
          const url = new URL(submitted.documentUrl);
          if (url.protocol === "https:" && url.hostname === "res.cloudinary.com" && !url.username && !url.password &&
              process.env.CLOUDINARY_CLOUD_NAME && url.pathname.startsWith(`/${process.env.CLOUDINARY_CLOUD_NAME}/`)) return student;
        } catch {}
        return { ...student, studentVerification: { ...submitted, documentUrl: undefined, untrustedDocument: true } };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    logger.error("admin.students_fetch_error", {
      error: error?.message || String(error),
      stack: error?.stack,
    });
    return NextResponse.json(
      { success: false, message: "Failed to fetch student verification requests" },
      { status: 500 }
    );
  }
}
