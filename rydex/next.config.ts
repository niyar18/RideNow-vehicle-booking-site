import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

try {
  const publicLogoPath = path.join(process.cwd(), "public", "logo.jpeg");
  const destIconPath = path.join(process.cwd(), "src", "app", "icon.jpeg");
  const oldFaviconPath = path.join(process.cwd(), "src", "app", "favicon.ico");

  if (fs.existsSync(publicLogoPath)) {
    fs.copyFileSync(publicLogoPath, destIconPath);
    console.log("Successfully copied logo.jpeg to src/app/icon.jpeg");
  }

  if (fs.existsSync(oldFaviconPath)) {
    fs.unlinkSync(oldFaviconPath);
    console.log("Successfully removed old src/app/favicon.ico");
  }
} catch (err) {
  console.error("Error setting up logo favicon:", err);
}

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Server",
    value: "RideNow",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=(self), payment=(self)",
  },
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://checkout.razorpay.com https://*.zegocloud.com https://*.zego.im; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.zegocloud.com; " +
      "img-src 'self' blob: data: https:; " +
      "connect-src 'self' https: wss: ws:; " +
      "font-src 'self' data: https://fonts.gstatic.com; " +
      "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://*.zegocloud.com https://*.zego.im; " +
      "media-src 'self' blob: data: https://*.zegocloud.com https://*.zego.im; " +
      "frame-ancestors 'self'; " +
      "object-src 'none';",
  },
];

const nextConfig: NextConfig = {
  /* config options here */
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
