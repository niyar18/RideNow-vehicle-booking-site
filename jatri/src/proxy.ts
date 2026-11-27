import { NextResponse } from "next/server";
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
  "/settings",
  "/explore",
  "/privacy",
  "/photo-credits",
  "/terms",
  "/payment-terms",
  "/cancellation-refund",
  "/partner-terms",
  "/cookies",
  "/grievance",
  "/safety",
];
const PUBLIC_API_ROUTES = [
  "/api/auth",
  "/api/otp",
  "/api/route",
  "/api/places",
  "/api/vehicles",
  "/api/track",
  "/api/payment/webhook",
  "/api/safety/telemetry",
  "/api/health",
  "/api/cron",
  "/api/legal/consent",
  "/api/booking/group/join",
];

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
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/.well-known/") ||
    // Only bypass if the last path segment looks like a file (has an extension)
    // and it is NOT under a protected route prefix.
    (/\.[a-zA-Z0-9]+$/.test(pathname) &&
      !pathname.startsWith("/api/") &&
      !pathname.startsWith("/admin") &&
      !pathname.startsWith("/partner"))
  ) {
    return NextResponse.next();
  }

function noCacheResponse(res: NextResponse = NextResponse.next()) {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

  /* ---------- PUBLIC ROUTES ---------- */
  const isPublicPage =
    PUBLIC_ROUTES.includes(pathname) ||
    pathname === "/track" ||
    pathname.startsWith("/track/") ||
    pathname === "/group/join" ||
    pathname.startsWith("/group/join/");

  if (isPublicPage) {
    return noCacheResponse();
  }

  if (PUBLIC_API_ROUTES.some((r) => pathname.startsWith(r))) {
    return noCacheResponse();
  }

  /* ---------- AUTH CHECK ---------- */
  const session = req.auth;

  if (!session) {
    if (pathname.startsWith("/api")) {
      return noCacheResponse(
        NextResponse.json(
          { success: false, message: "Unauthorized: Authentication required" },
          { status: 401 }
        )
      );
    }
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  const role = session.user?.role;

  /* ================= ROLE BASED ================= */

  /* ----- ADMIN (Pages & APIs) ----- */
  if (pathname.startsWith("/admin")) {
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }
  }

  if (pathname.startsWith("/api/admin")) {
    if (role !== "admin") {
      return noCacheResponse(
        NextResponse.json(
          { success: false, message: "Forbidden: Admin privileges required" },
          { status: 403 }
        )
      );
    }
  }

  /* ----- PARTNER / VENDOR (Pages) ----- */
  if (pathname === "/partner" || pathname === "/partners" || pathname === "/partner/dashboard") {
    if (role === "vendor" || role === "admin") {
      return NextResponse.redirect(new URL("/partners/dashboard", req.nextUrl));
    } else {
      return NextResponse.redirect(new URL(VENDOR_ONBOARDING_START, req.nextUrl));
    }
  }

  if (pathname.startsWith("/partner/") || pathname.startsWith("/partners/")) {
    // ✅ Allow all vendor onboarding routes for any logged-in user
    if (pathname.startsWith("/partner/onboard")) {
      return noCacheResponse();
    }

    // ❌ Rest of partner routes only for vendors / admins
    if (role !== "vendor" && role !== "admin") {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }
  }

  /* ----- PARTNER / VENDOR (APIs) ----- */
  if (pathname.startsWith("/api/partner")) {
    const isPartnerOnboardingApi =
      pathname.startsWith("/api/partner/vehicle") ||
      pathname.startsWith("/api/partner/documents") ||
      pathname.startsWith("/api/partner/bank") ||
      pathname.startsWith("/api/partner/video-kyc");

    if (!isPartnerOnboardingApi && role !== "vendor" && role !== "admin") {
      return noCacheResponse(
        NextResponse.json(
          { success: false, message: "Forbidden: Partner privileges required" },
          { status: 403 }
        )
      );
    }
  }

  return noCacheResponse();
});

export default proxy;

/* ================= MATCHER ================= */

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
