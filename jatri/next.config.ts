import type { NextConfig } from "next";
import fs from "fs";
import path from "path";
import { createRequire } from "node:module";

try {
  const publicJatriPng = path.join(process.cwd(), "public", "logojatri.png");
  const publicJatriWebp = path.join(process.cwd(), "public", "logojatri.webp");
  const destIconPng = path.join(process.cwd(), "src", "app", "icon.png");
  const destIconWebp = path.join(process.cwd(), "src", "app", "icon.webp");

  if (fs.existsSync(publicJatriPng)) {
    fs.copyFileSync(publicJatriPng, destIconPng);
  }
  if (fs.existsSync(publicJatriWebp)) {
    fs.copyFileSync(publicJatriWebp, destIconWebp);
  }
} catch (err) {
  console.error("Error setting up Jaatri favicon:", err);
}

// Keep the MapLibre worker and its relative import together. Next hashes individual
// bundled module filenames, but this worker has an unbundled relative dependency.
const resolveDependency = createRequire(path.join(process.cwd(), "package.json"));
const mapRuntime = path.dirname(resolveDependency.resolve("maplibre-gl/package.json"));
const mapRuntimeVersion = (JSON.parse(fs.readFileSync(path.join(mapRuntime, "package.json"), "utf8")) as { version: string }).version;
const mapRuntimePublicDir = path.join(process.cwd(), "public", "map-runtime", mapRuntimeVersion);
fs.mkdirSync(mapRuntimePublicDir, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  fs.copyFileSync(path.join(mapRuntime, "dist", file), path.join(mapRuntimePublicDir, file));
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
    key: "X-XSS-Protection",
    value: "0",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(self), microphone=(self), geolocation=(self), payment=*, accelerometer=(self \"https://*.razorpay.com\" \"https://checkout.razorpay.com\"), gyroscope=(self \"https://*.razorpay.com\" \"https://checkout.razorpay.com\")",
  },
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.razorpay.com https://checkout.razorpay.com https://cdn.razorpay.com https://*.zegocloud.com https://*.zego.im; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.zegocloud.com; " +
      "img-src 'self' blob: data: https:; " +
      "connect-src 'self' https: wss: ws: https://*.razorpay.com https://lumberjack.razorpay.com https://lumberjack-cx.razorpay.com; " +
      "font-src 'self' data: https://fonts.gstatic.com; " +
      "frame-src 'self' https://*.razorpay.com https://checkout.razorpay.com https://api.razorpay.com https://cdn.razorpay.com https://*.zegocloud.com https://*.zego.im; " +
      "media-src 'self' blob: data: https://*.zegocloud.com https://*.zego.im; " +
      "base-uri 'self'; " +
      "form-action 'self' https://*.razorpay.com https://checkout.razorpay.com; " +
      "frame-ancestors 'self'; " +
      "object-src 'none';",
  },
];

const nextConfig: NextConfig = {
  /* config options here */
  poweredByHeader: false,
  images: {
    // Bust stale cached artwork without permitting arbitrary image query strings.
    localPatterns: [
      { pathname: "/**", search: "" },
      { pathname: "/fleet/**", search: "?v=photo-1" },
      { pathname: "/mobile-home/**", search: "?v=photo-1" },
      { pathname: "/explore/**", search: "?v=photo-1" },
    ],
    formats: ["image/avif", "image/webp"],
    qualities: [50, 75, 80, 85, 90, 94, 95, 100],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
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
