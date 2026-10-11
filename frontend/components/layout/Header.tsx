"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Zap } from "lucide-react";

const navLinks = [
  { href: "/shows",           label: "Shows" },
  { href: "/shows?status=live", label: "Live", badge: true },
  { href: "/vote",            label: "Vote" },
  { href: "/wars",            label: "Wars" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-purple-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center shadow">
              <Zap className="w-4 h-4 text-white" fill="currentColor" />
            </div>
            <span className="text-xl font-bold text-violet-900">
              Fan<span className="text-pink-500">Clash</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 ml-6">
            {navLinks.map((link) => (
              <Link key={link.label} href={link.href}
                className="relative px-4 py-2 text-sm font-medium text-gray-600 hover:text-violet-600 rounded-lg hover:bg-violet-50 transition-all flex items-center gap-1.5">
                {link.label}
                {link.badge && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">LIVE</span>
                )}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 ml-auto">
            <button className="hidden md:block text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-pink-500 px-4 py-2 rounded-xl shadow hover:shadow-lg hover:scale-105 transition-all">
              Join Free
            </button>
            <button className="md:hidden p-2 rounded-lg text-gray-500 hover:text-violet-600 hover:bg-violet-50 transition-all"
              onClick={() => setOpen(!open)} aria-label="Toggle menu">
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden border-t border-purple-100 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link key={link.label} href={link.href}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-600 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all"
                onClick={() => setOpen(false)}>
                {link.label}
                {link.badge && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">LIVE</span>}
              </Link>
            ))}
            <div className="pt-3 border-t border-purple-100">
              <button className="w-full text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-pink-500 py-2.5 px-4 rounded-xl shadow">
                Join FanClash Free
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
