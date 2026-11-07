import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/db";
import PushSubscription from "@/models/push-subscription.model";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({
        authenticated: false,
        isSubscribed: false,
      });
    }

    const endpoint = req.nextUrl.searchParams.get("endpoint");

    const query: any = {
      user: session.user.id,
      isActive: true,
    };

    if (endpoint) {
      query.endpoint = endpoint;
    }

    const existing = await PushSubscription.findOne(query);

    return NextResponse.json({
      authenticated: true,
      isSubscribed: Boolean(existing),
      endpoint: existing?.endpoint,
    });
  } catch (error: any) {
    console.error("GET /api/notifications/status error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check subscription status" },
      { status: 500 }
    );
  }
}
