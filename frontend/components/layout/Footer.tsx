"use client";

import Link from "next/link";
import { Zap, X, Globe, Share2 } from "lucide-react";

const footerLinks = {
  Platform: [
    { label: "All Shows", href: "/shows" },
    { label: "Live Now", href: "/shows?status=live" },
    { label: "Trending", href: "/shows" },
    { label: "Categories", href: "/shows" },
  ],
  Community: [
    { label: "Fan Wars", href: "/wars" },
    { label: "Leaderboard", href: "/vote" },
    { label: "Discussions", href: "/wars" },
    { label: "Daily Polls", href: "/vote" },
  ],
  Company: [
    { label: "About", href: "/" },
    { label: "Careers", href: "/" },
    { label: "Press", href: "/" },
    { label: "Contact", href: "/" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/" },
    { label: "Terms of Service", href: "/" },
    { label: "Cookie Policy", href: "/" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-white border-t border-purple-100 mt-16">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" fill="currentColor" />
              </div>
              <span className="text-xl font-bold text-violet-900">Fan<span className="text-pink-500">Clash</span></span>
            </Link>
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              The ultimate fan engagement platform. Vote, support your favorites, and battle for the top.
            </p>
            <div className="flex items-center gap-3">
              {[X, Globe, Share2].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center text-gray-400 hover:text-violet-600 hover:bg-violet-100 transition-all">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-gray-500 hover:text-violet-600 transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-purple-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400">© 2026 FanClash. All rights reserved.</p>
          <p className="text-sm text-gray-400 font-medium">Fandoms Battle Here ⚡</p>
        </div>
      </div>
    </footer>
  );
}
