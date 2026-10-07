"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Tv, Vote, Swords, User } from "lucide-react";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/shows", icon: Tv, label: "Shows" },
  { href: "/vote", icon: Vote, label: "Vote" },
  { href: "/wars", icon: Swords, label: "Wars" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-purple-100 shadow-lg">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 flex-1 py-2 px-1 rounded-xl transition-all ${
                isActive
                  ? "text-brand-purple"
                  : "text-text-muted hover:text-brand-purple"
              }`}
            >
              <div
                className={`p-1.5 rounded-lg transition-all ${
                  isActive ? "bg-brand-purple/10" : ""
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-all ${isActive ? "scale-110" : ""}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              <span className={`text-[10px] font-medium ${isActive ? "font-semibold" : ""}`}>
                {label}
              </span>
              {isActive && (
                <div className="absolute top-0 w-8 h-0.5 bg-gradient-brand rounded-b-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
