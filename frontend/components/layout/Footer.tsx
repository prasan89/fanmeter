"use client";

import Link from "next/link";

const EVENTS = [
  { slug: "bigg-boss-tamil-10",    label: "Tamil 10" },
  { slug: "bigg-boss-telugu-10",   label: "Telugu 10" },
  { slug: "bigg-boss-malayalam-8", label: "Malayalam 8" },
  { slug: "bigg-boss-kannada-13",  label: "Kannada 13" },
  { slug: "bigg-boss-hindi-20",    label: "Hindi 20" },
  { slug: "bigg-boss-bangla-3",    label: "Bangla 3" },
] as const;

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-1.5 mb-2">
              <span className="text-base font-black text-gray-900">
                Fan<span className="text-violet-600">Meter</span>
              </span>
            </Link>
            <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
              Independent fan community polls for Bigg Boss Tamil 10, Telugu 10,
              Malayalam 8, Kannada 13, Hindi 20, and Bangla 3. Not affiliated
              with Star Vijay, Star Maa, Asianet, Colors Kannada, Colors TV,
              Star Jalsha, or Endemol Shine.
            </p>
          </div>

          {/* Event links — all six seasons */}
          <nav aria-label="Event pages">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide mb-2">
              Seasons
            </h4>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5">
              {EVENTS.map(({ slug, label }) => (
                <li key={slug}>
                  <Link
                    href={`/events/${slug}`}
                    className="text-sm text-gray-500 hover:text-violet-600 transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-400">© 2026 FanMeter. All rights reserved.</p>
          <p className="text-xs text-gray-400">Community polls — not official broadcaster voting.</p>
        </div>
      </div>
    </footer>
  );
}
