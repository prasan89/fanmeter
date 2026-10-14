"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown, Menu, X } from "lucide-react";
import { useState } from "react";

const NAV_LINKS = [
  { label: "Home",       href: "/" },
  { label: "Tamil 10",  href: "/events/bigg-boss-tamil-10" },
  { label: "Telugu 10", href: "/events/bigg-boss-telugu-10" },
  { label: "Malay. 8",  href: "/events/bigg-boss-malayalam-8" },
  { label: "Kannada 13",href: "/events/bigg-boss-kannada-13" },
  { label: "Hindi 20",  href: "/events/bigg-boss-hindi-20" },
  { label: "Bangla 3",  href: "/events/bigg-boss-bangla-3" },
] as const;

export function Header() {
  const pathname  = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b-2 border-violet-100 shadow-sm">
      <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0" onClick={() => setOpen(false)}>
            <Crown className="w-5 h-5 text-violet-600" aria-hidden />
            <span className="text-lg font-black text-gray-900">
              Fan<span className="text-violet-600">Meter</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
            {NAV_LINKS.map(({ label, href }) => {
              const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-violet-50 text-violet-700 font-semibold"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen(prev => !prev)}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav panel */}
      {open && (
        <div className="lg:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          {NAV_LINKS.map(({ label, href }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-violet-50 text-violet-700 font-semibold"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
