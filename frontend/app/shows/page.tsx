import Link from "next/link";
import { getShows } from "@/lib/api";
import { ShowCard } from "@/components/ui/ShowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EmptyState } from "@/components/ui/States";
import { categoryLabel } from "@/lib/utils";
import type { Show } from "@/types";

export const dynamic = "force-dynamic";

const categories = [
  { slug: "all", label: "All Shows", icon: "🎬" },
  { slug: "live", label: "Live Now", icon: "🔴" },
  { slug: "reality-tv", label: "Reality TV", icon: "📺" },
  { slug: "music", label: "Music", icon: "🎵" },
  { slug: "sports", label: "Sports", icon: "⚽" },
  { slug: "k-pop", label: "K-pop", icon: "🎤" },
  { slug: "cricket", label: "Cricket", icon: "🏏" },
  { slug: "other", label: "Other", icon: "🌟" },
];

interface ShowsPageProps {
  searchParams: Promise<{ filter?: string; category?: string }>;
}

export const metadata = {
  title: "Shows — FanClash",
  description: "Browse all shows on FanClash. Reality TV, Music, Sports, K-pop and more.",
};

export default async function ShowsPage({ searchParams }: ShowsPageProps) {
  const { filter, category } = await searchParams;
  let allShows: Show[] = [];
  let apiError = false;

  try {
    allShows = await getShows();
  } catch {
    apiError = true;
  }

  const activeFilter = filter ?? "all";
  const activeCategory = category ?? "all";

  const filteredShows = allShows.filter((show) => {
    if (activeFilter === "live") return show.status === "live";
    if (activeFilter === "upcoming") return show.status === "upcoming";
    if (activeFilter === "trending") return true;
    if (activeCategory !== "all") return show.category === activeCategory;
    return true;
  });

  const groupedByCategory = allShows.reduce<Record<string, typeof allShows>>(
    (acc, show) => {
      const cat = show.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(show);
      return acc;
    },
    {}
  );

  return (
    <div className="min-h-screen bg-surface-secondary">
      {/* Page Hero */}
      <div className="bg-gradient-to-br from-brand-purple-dark via-brand-purple to-brand-pink py-16 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-3">All Shows</h1>
          <p className="text-white/70 text-lg max-w-xl mx-auto">
            Discover and support your favorite shows across Reality TV, Music, Sports, and more
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path d="M0 40L1440 40L1440 10C1200 30 960 0 720 10C480 20 240 0 0 10L0 40Z" fill="#F8F7FF" />
          </svg>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
          {[
            { href: "/shows", label: "All", filter: "all" },
            { href: "/shows?filter=live", label: "🔴 Live", filter: "live" },
            { href: "/shows?filter=upcoming", label: "Upcoming", filter: "upcoming" },
            { href: "/shows?filter=trending", label: "🔥 Trending", filter: "trending" },
          ].map((tab) => (
            <Link
              key={tab.filter}
              href={tab.href}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                activeFilter === tab.filter
                  ? "bg-gradient-brand text-white shadow-brand-sm"
                  : "bg-white text-text-secondary border border-gray-200 hover:border-brand-purple/30 hover:text-brand-purple"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={cat.slug === "all" ? "/shows" : cat.slug === "live" ? "/shows?filter=live" : `/shows?category=${cat.slug}`}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeCategory === cat.slug
                  ? "bg-brand-purple text-white"
                  : "bg-white text-text-secondary hover:bg-surface-tertiary hover:text-brand-purple border border-gray-100"
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </Link>
          ))}
        </div>

        {apiError ? (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-8 text-center">
            <p className="text-orange-600 font-medium">
              Unable to connect to the API. Shows will appear once the backend is running.
            </p>
          </div>
        ) : activeFilter === "all" && activeCategory === "all" ? (
          /* Grouped by category */
          <div className="space-y-12">
            {Object.entries(groupedByCategory).map(([cat, catShows]) => (
              <div key={cat}>
                <SectionHeader
                  title={categoryLabel(cat)}
                  subtitle={`${catShows.length} show${catShows.length !== 1 ? "s" : ""}`}
                  action={
                    <Link
                      href={`/shows?category=${cat}`}
                      className="text-sm font-semibold text-brand-purple hover:underline"
                    >
                      See all
                    </Link>
                  }
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {catShows.map((show) => (
                    <ShowCard key={show.id} show={show} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filteredShows.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredShows.map((show) => (
              <ShowCard key={show.id} show={show} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No shows found"
            description="No shows match your current filter. Try a different category or filter."
            icon="📺"
            action={
              <Link
                href="/shows"
                className="text-sm font-semibold text-white bg-gradient-brand px-5 py-2.5 rounded-xl shadow-brand-sm"
              >
                View All Shows
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}
