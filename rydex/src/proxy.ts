import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "./auth";

/* ================= CONFIG ================= */

const PUBLIC_ROUTES = [
  "/",
  "/book",
  "/booking",
  "/bookings",
  "/contact",
  "/faq",
  "/fleet",
  "/search",
];
const PUBLIC_API_ROUTES = ["/api/auth"];

const VENDOR_ONBOARDING_START = "/partner/onboard/vehicle";

/* ================= MIDDLEWARE ================= */

export const proxy = auth(async (req) => {
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
  const session = req.auth;

  if (!session) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  const role = session.user?.role;

  /* ================= ROLE BASED ================= */

  /* ----- ADMIN ----- */
  if (pathname.startsWith("/admin")) {
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/", req.nextUrl));
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
      return NextResponse.redirect(new URL("/", req.nextUrl));
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
});

export default proxy;

/* ================= MATCHER ================= */

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
