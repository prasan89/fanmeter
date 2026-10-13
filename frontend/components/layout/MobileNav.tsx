"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Heart } from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();

  const eventMatch = pathname.match(/^\/events\/(bigg-boss-(?:tamil|telugu)-10)/);
  const eventSlug  = eventMatch?.[1];

  if (eventSlug) {
    return (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-gray-100 shadow-lg">
        <div className="flex items-center justify-around h-14 px-1">
          <Link href="/" className="flex flex-col items-center gap-0.5 flex-1 py-2 text-gray-400 hover:text-gray-600">
            <Home className="w-5 h-5" strokeWidth={2} />
            <span className="text-[10px] font-medium">Events</span>
          </Link>
          <Link
            href={`/events/${eventSlug}`}
            className="flex flex-col items-center gap-0.5 flex-1 py-2 text-violet-600"
          >
            <Heart className="w-5 h-5" strokeWidth={2.5} />
            <span className="text-[10px] font-bold">Rankings</span>
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-gray-100 shadow-lg">
      <div className="flex items-center justify-around h-14 px-1">
        <Link href="/" className="flex flex-col items-center gap-0.5 flex-1 py-2 text-violet-600">
          <Home className="w-5 h-5" strokeWidth={2.5} />
          <span className="text-[10px] font-bold">Events</span>
        </Link>
      </div>
    </nav>
  );
}
