import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
  async redirects() {
    return [
      // Show page aliases
      { source: "/shows/tamil-10",  destination: "/shows/bigg-boss-tamil",  permanent: false },
      { source: "/shows/telugu-10", destination: "/shows/bigg-boss-telugu", permanent: false },
      // Vote page aliases
      { source: "/vote/tamil-10",   destination: "/vote/bigg-boss-tamil",   permanent: false },
      { source: "/vote/telugu-10",  destination: "/vote/bigg-boss-telugu",  permanent: false },
      // Legacy /vote → home (generic vote page is not useful)
      { source: "/vote",            destination: "/",                        permanent: false },
    ];
  },
};

export default nextConfig;
