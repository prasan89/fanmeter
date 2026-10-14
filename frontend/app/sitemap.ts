import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://fanmeter.in";

const EVENT_SLUGS = [
  "bigg-boss-tamil-10",
  "bigg-boss-telugu-10",
  "bigg-boss-malayalam-8",
  "bigg-boss-kannada-13",
  "bigg-boss-hindi-20",
  "bigg-boss-bangla-3",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString().split("T")[0];

  const homePage: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
  ];

  const eventPages: MetadataRoute.Sitemap = EVENT_SLUGS.map((slug) => ({
    url: `${SITE_URL}/events/${slug}`,
    lastModified: now,
    changeFrequency: "hourly",
    priority: 0.9,
  }));

  return [...homePage, ...eventPages];
}
