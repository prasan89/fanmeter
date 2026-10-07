import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | null): string {
  if (!date) return "TBD";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function categoryLabel(category: string): string {
  const map: Record<string, string> = {
    "reality-tv": "Reality TV",
    music: "Music",
    sports: "Sports",
    "k-pop": "K-pop",
    cricket: "Cricket",
    other: "Other",
  };
  return map[category] ?? slugToTitle(category);
}
