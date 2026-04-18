import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "https://bendro.app").replace(/\/+$/, "")
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/signin", "/legal/"],
        disallow: [
          "/api/",
          "/home",
          "/library",
          "/player",
          "/account",
          "/settings",
          "/onboarding",
          "/medical-guidance",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
