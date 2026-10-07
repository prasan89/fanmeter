"use client";

import Link from "next/link";
import { Zap, X, Globe, Share2 } from "lucide-react";

const footerLinks = {
  Platform: [
    { label: "All Shows", href: "/shows" },
    { label: "Live Now", href: "/shows?filter=live" },
    { label: "Trending", href: "/shows?filter=trending" },
    { label: "Categories", href: "/shows" },
  ],
  Community: [
    { label: "Fan Wars", href: "/wars" },
    { label: "Leaderboard", href: "/leaderboard" },
    { label: "Discussions", href: "/discuss" },
    { label: "Daily Polls", href: "/polls" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Press", href: "/press" },
    { label: "Contact", href: "/contact" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-white border-t border-purple-100 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" fill="currentColor" />
              </div>
              <span className="text-xl font-bold text-brand-purple-dark">
                Fan<span className="text-brand-pink">Clash</span>
              </span>
            </Link>
            <p className="text-sm text-text-muted mb-4 leading-relaxed">
              The ultimate fan engagement platform. Vote, support your favorites, and battle for the top.
            </p>
            <div className="flex items-center gap-3">
              {[X, Globe, Share2].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-xl bg-surface-tertiary flex items-center justify-center text-text-muted hover:text-brand-purple hover:bg-brand-purple/10 transition-all"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-text-primary mb-3">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-text-muted hover:text-brand-purple transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-purple-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-text-muted">
            © 2026 FanClash. All rights reserved.
          </p>
          <p className="text-sm text-text-muted font-medium">
            Fandoms Battle Here ⚡
          </p>
        </div>
      </div>
    </footer>
  );
}
