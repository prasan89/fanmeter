import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "media.housepulse.in",
      },
      {
        protocol: "https",
        hostname: "**.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
    ],
  },

  output: "standalone",

  async headers() {
    return [
      // Cache static Next.js assets forever (they're content-hashed)
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Cache event pages for 60s with stale-while-revalidate for fast subsequent loads
      {
        source: "/events/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      // Sitemap and robots can be cached for 1 hour
      {
        source: "/:file(sitemap.xml|robots.txt)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=3600",
          },
        ],
      },
      // Security headers
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },

  async redirects() {
    return [
      // Show page aliases — permanent (these URLs have never been public, safe to 308)
      { source: "/shows/tamil-10",  destination: "/shows/bigg-boss-tamil",  permanent: true },
      { source: "/shows/telugu-10", destination: "/shows/bigg-boss-telugu", permanent: true },
      // Vote page aliases — permanent
      { source: "/vote/tamil-10",   destination: "/vote/bigg-boss-tamil",   permanent: true },
      { source: "/vote/telugu-10",  destination: "/vote/bigg-boss-telugu",  permanent: true },
      // Legacy /vote → home
      { source: "/vote",            destination: "/",                        permanent: false },
    ];
  },
};

export default nextConfig;
