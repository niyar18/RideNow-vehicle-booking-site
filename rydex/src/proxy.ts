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

  /* ---------- SECURE SCANNER PROBES ---------- */
  const lowercasePath = pathname.toLowerCase();
  const isProbe = [
    "/metrics",
    "/actuator",
    "/swagger",
    "/api-docs",
    "/graphiql",
    "/graphql",
    "/docs",
    "/health",
    "/healthz",
    "/ready",
    "/ping",
  ].some((probe) => lowercasePath === probe || lowercasePath.startsWith(probe + "/"));

  if (isProbe) {
    return new NextResponse("Not Found", { status: 404 });
  }

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
  if (pathname === "/partner" || pathname === "/partners" || pathname === "/partner/dashboard") {
    if (role === "vendor") {
      return NextResponse.redirect(new URL("/partners/dashboard", req.nextUrl));
    } else {
      return NextResponse.redirect(new URL("/partner/onboard/vehicle", req.nextUrl));
    }
  }

  if (pathname.startsWith("/partner/") || pathname.startsWith("/partners/")) {
    // ✅ Allow all vendor onboarding routes for any logged-in user
    if (pathname.startsWith("/partner/onboard")) {
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
