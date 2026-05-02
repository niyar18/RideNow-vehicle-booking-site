import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "./auth";

/* ================= CONFIG ================= */

const PUBLIC_ROUTES = ["/"];
const PUBLIC_API_ROUTES = ["/api/auth"];

const VENDOR_ONBOARDING_START = "/partner/onboard/vehicle";

/* ================= MIDDLEWARE ================= */

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  /* ---------- STATIC FILES ---------- */
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  /* ---------- PUBLIC ROUTES ---------- */
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  if (PUBLIC_API_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  /* ---------- AUTH CHECK ---------- */
  const session = await auth();

  if (!session) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const role = session.user?.role;

  /* ================= ROLE BASED ================= */

  /* ----- ADMIN ----- */
  if (pathname.startsWith("/admin")) {
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  /* ----- PARTNER / VENDOR ----- */
  if (pathname.startsWith("/partner")) {
    // ✅ Allow vendor onboarding start for any logged-in user
    if (pathname === VENDOR_ONBOARDING_START) {
      return NextResponse.next();
    }

    // ❌ Rest partner routes only for vendors
    if (role !== "vendor") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  /* ---------- API (protected) ---------- */
  if (pathname.startsWith("/api")) {
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

/* ================= MATCHER ================= */

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
