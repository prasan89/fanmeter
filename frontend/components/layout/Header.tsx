"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Zap } from "lucide-react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/shows", label: "Shows" },
  { href: "/shows?filter=live", label: "Live", badge: "LIVE" },
  { href: "/shows?filter=trending", label: "Trending" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-purple-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center shadow-brand-sm group-hover:shadow-brand-lg transition-shadow">
              <Zap className="w-4 h-4 text-white" fill="currentColor" />
            </div>
            <span className="text-xl font-bold text-brand-purple-dark">
              Fan<span className="text-brand-pink">Clash</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative px-4 py-2 text-sm font-medium text-text-secondary hover:text-brand-purple rounded-lg hover:bg-surface-tertiary transition-all flex items-center gap-1.5"
              >
                {link.label}
                {link.badge && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white animate-pulse-live">
                    {link.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <button className="text-sm font-medium text-text-secondary hover:text-brand-purple px-4 py-2 rounded-lg hover:bg-surface-tertiary transition-all">
              Sign In
            </button>
            <button className="text-sm font-semibold text-white bg-gradient-brand px-5 py-2 rounded-xl shadow-brand-sm hover:shadow-brand-lg hover:scale-105 transition-all">
              Join FanClash
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg text-text-secondary hover:text-brand-purple hover:bg-surface-tertiary transition-all"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-purple-100 py-4 space-y-1 animate-fade-in">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-text-secondary hover:text-brand-purple hover:bg-surface-tertiary rounded-lg transition-all"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
                {link.badge && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
                    {link.badge}
                  </span>
                )}
              </Link>
            ))}
            <div className="pt-3 border-t border-purple-100 flex flex-col gap-2">
              <button className="w-full text-sm font-medium text-text-secondary py-2.5 px-4 border border-purple-200 rounded-xl hover:bg-surface-tertiary transition-all">
                Sign In
              </button>
              <button className="w-full text-sm font-semibold text-white bg-gradient-brand py-2.5 px-4 rounded-xl shadow-brand-sm">
                Join FanClash
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
