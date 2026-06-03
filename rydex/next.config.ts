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

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
