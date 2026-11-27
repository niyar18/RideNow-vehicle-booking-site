import type { NextRequest } from "next/server";
import { reviewStudent } from "@/lib/adminStudentReview.server";
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return reviewStudent(req, (await params).id, "verified");
}
