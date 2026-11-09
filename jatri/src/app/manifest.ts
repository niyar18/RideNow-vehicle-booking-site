import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Jaatri (যাত্ৰী) - Smart Vehicle Booking",
    short_name: "Jaatri",
    description: "Reliable Vehicle Booking & Logistics Across Assam & Northeast India",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF7F0",
    theme_color: "#046A38",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/logojatri.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo.webp",
        sizes: "192x192",
        type: "image/webp",
      },
    ],
  };
}
