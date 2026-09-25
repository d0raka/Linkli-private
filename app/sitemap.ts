import type { MetadataRoute } from "next";
import { templates } from "@/lib/templates";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://linkli.online";
  const updated = new Date();
  return [
    { url: base, lastModified: updated, changeFrequency: "weekly", priority: 1 },
    ...templates.map((template) => ({
      url: `${base}/preview/${template.id}`,
      lastModified: updated,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    { url: `${base}/paywall`, lastModified: updated, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/legal`, lastModified: updated, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/contact`, lastModified: updated, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/accessibility`, lastModified: updated, changeFrequency: "monthly", priority: 0.3 },
  ];
}
