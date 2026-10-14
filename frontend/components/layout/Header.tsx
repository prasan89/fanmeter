"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header() {
  const pathname = usePathname();
  const onHome   = pathname === "/";

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo — always a link back to home */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl" aria-hidden>👑</span>
            <span className="text-lg font-black text-gray-900">
              Fan<span className="text-violet-600">Meter</span>
            </span>
          </Link>

          {/* On the homepage show nothing — nav lives inside events */}
          {!onHome && (
            <Link
              href="/"
              className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
            >
              ← All events
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
