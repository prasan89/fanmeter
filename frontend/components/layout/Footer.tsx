"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-1.5 mb-2">
              <span className="text-base font-black text-gray-900">
                Fan<span className="text-violet-600">Meter</span>
              </span>
            </Link>
          <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
              Independent fan community polls for Bigg Boss Tamil 10, Telugu 10, Malayalam 8, and Kannada 13.
              Not affiliated with Star Vijay, Star Maa, Asianet, Colors Kannada, or Endemol Shine.
            </p>
          </div>

          {/* Event links */}
          <div className="flex gap-6 flex-wrap">
            <div>
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide mb-2">Tamil 10</h4>
              <ul className="space-y-1.5">
                <li><Link href="/events/bigg-boss-tamil-10" className="text-sm text-gray-500 hover:text-violet-600 transition-colors">Rankings</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide mb-2">Telugu 10</h4>
              <ul className="space-y-1.5">
                <li><Link href="/events/bigg-boss-telugu-10" className="text-sm text-gray-500 hover:text-violet-600 transition-colors">Rankings</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide mb-2">Malayalam 8</h4>
              <ul className="space-y-1.5">
                <li><Link href="/events/bigg-boss-malayalam-8" className="text-sm text-gray-500 hover:text-violet-600 transition-colors">Rankings</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide mb-2">Kannada 13</h4>
              <ul className="space-y-1.5">
                <li><Link href="/events/bigg-boss-kannada-13" className="text-sm text-gray-500 hover:text-violet-600 transition-colors">Rankings</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-400">© 2026 FanMeter. All rights reserved.</p>
          <p className="text-xs text-gray-400">Community polls — not official broadcaster voting.</p>
        </div>
      </div>
    </footer>
  );
}
