import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/preview/", "/legal", "/contact", "/accessibility"],
        disallow: ["/admin", "/studio", "/account", "/checkout", "/api/", "/login", "/register", "/verify-email", "/reset-password", "/forgot-password"],
      },
    ],
    sitemap: "https://linkli.online/sitemap.xml",
  };
}
