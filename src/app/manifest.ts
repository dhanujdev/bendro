import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bend – Daily Stretching",
    short_name: "Bend",
    description: "Daily stretching, made simple. Guided routines to build a consistent stretch habit.",
    start_url: "/home",
    display: "standalone",
    background_color: "#0F0F14",
    theme_color: "#7C5CFC",
    orientation: "portrait",
    categories: ["health", "fitness"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  }
}
