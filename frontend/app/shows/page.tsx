import type { Metadata } from "next";
import Link from "next/link";
import { getShows } from "@/lib/api";
import { ShowCard } from "@/components/ui/ShowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EmptyState } from "@/components/ui/States";
import { categoryLabel } from "@/lib/utils";
import type { Show } from "@/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explore Shows — FanClash",
  description: "Browse all shows on FanClash. Reality TV, Music, Sports, K-pop and more. Find your fandom.",
  openGraph: {
    title: "Explore Shows — FanClash",
    description: "Find your fandom across Reality TV, Music, Sports, K-pop and more.",
  },
};

const CATEGORY_TABS = [
  { slug: "all", label: "All Shows", icon: "🎬" },
  { slug: "reality-tv", label: "Reality TV", icon: "📺" },
  { slug: "music", label: "Music", icon: "🎵" },
  { slug: "sports", label: "Sports", icon: "⚽" },
  { slug: "k-pop", label: "K-pop", icon: "🎤" },
  { slug: "cricket", label: "Cricket", icon: "🏏" },
  { slug: "entertainment", label: "Entertainment", icon: "🎬" },
];

const STATUS_FILTERS = [
  { value: "all", label: "All Status" },
  { value: "live", label: "🔴 Live" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Ended" },
];

interface ShowsPageProps {
  searchParams: Promise<{ category?: string; language?: string; status?: string }>;
}

export default async function ShowsPage({ searchParams }: ShowsPageProps) {
  const { category, language, status } = await searchParams;

  let allShows: Show[] = [];
  let apiError = false;

  try {
    allShows = await getShows();
  } catch {
    apiError = true;
  }

  // Derive unique languages from all shows
  const allLanguages = Array.from(
    new Set(allShows.map((s) => s.language).filter(Boolean) as string[])
  ).sort();

  // Client-side filter (data already fetched)
  const filteredShows = allShows.filter((show) => {
    if (category && category !== "all" && show.category !== category) return false;
    if (language && language !== "all" && show.language?.toLowerCase() !== language.toLowerCase()) return false;
    if (status && status !== "all" && show.status !== status) return false;
    return true;
  });

  const groupedByCategory = filteredShows.reduce<Record<string, Show[]>>((acc, show) => {
    const cat = show.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(show);
    return acc;
  }, {});

  const activeCategory = category ?? "all";
  const activeStatus = status ?? "all";
  const activeLanguage = language ?? "all";
  const isFiltered = activeCategory !== "all" || activeStatus !== "all" || activeLanguage !== "all";

  function filterHref(overrides: { category?: string; language?: string; status?: string }) {
    const params = new URLSearchParams();
    const c = overrides.category ?? activeCategory;
    const l = overrides.language ?? activeLanguage;
    const s = overrides.status ?? activeStatus;
    if (c !== "all") params.set("category", c);
    if (l !== "all") params.set("language", l);
    if (s !== "all") params.set("status", s);
    const qs = params.toString();
    return `/shows${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="min-h-screen bg-surface-secondary">
      {/* Page Hero */}
      <div className="bg-gradient-to-br from-brand-purple-dark via-brand-purple to-brand-pink py-14 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-2">Explore Shows</h1>
          <p className="text-white/70 text-lg max-w-xl">
            Find your fandom. {allShows.length > 0 && `${allShows.length} shows across ${allLanguages.length} languages.`}
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none" preserveAspectRatio="none">
            <path d="M0 40L1440 40L1440 10C1200 30 960 0 720 10C480 20 240 0 0 10L0 40Z" fill="#F8F7FF" />
          </svg>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category filter pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          {CATEGORY_TABS.map((cat) => (
            <Link
              key={cat.slug}
              href={filterHref({ category: cat.slug })}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                activeCategory === cat.slug
                  ? "bg-gradient-brand text-white shadow-brand-sm"
                  : "bg-white text-text-secondary border border-gray-200 hover:border-brand-purple/30 hover:text-brand-purple"
              }`}
            >
              <span>{cat.icon}</span> {cat.label}
            </Link>
          ))}
        </div>

        {/* Status + Language filters row */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          {/* Status pills */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {STATUS_FILTERS.map((sf) => (
              <Link
                key={sf.value}
                href={filterHref({ status: sf.value })}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeStatus === sf.value
                    ? "bg-brand-purple text-white"
                    : "bg-white text-text-secondary border border-gray-200 hover:text-brand-purple hover:border-brand-purple/30"
                }`}
              >
                {sf.label}
              </Link>
            ))}
          </div>

          {/* Divider */}
          {allLanguages.length > 0 && (
            <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block" />
          )}

          {/* Language pills */}
          {allLanguages.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              <Link
                href={filterHref({ language: "all" })}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeLanguage === "all"
                    ? "bg-brand-orange text-white"
                    : "bg-white text-text-secondary border border-gray-200 hover:text-brand-orange hover:border-brand-orange/30"
                }`}
              >
                All Languages
              </Link>
              {allLanguages.map((lang) => (
                <Link
                  key={lang}
                  href={filterHref({ language: lang })}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeLanguage.toLowerCase() === lang.toLowerCase()
                      ? "bg-brand-orange text-white"
                      : "bg-white text-text-secondary border border-gray-200 hover:text-brand-orange hover:border-brand-orange/30"
                  }`}
                >
                  {lang}
                </Link>
              ))}
            </div>
          )}

          {/* Clear filters */}
          {isFiltered && (
            <Link
              href="/shows"
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium text-text-muted hover:text-red-500 transition-colors ml-auto"
            >
              ✕ Clear
            </Link>
          )}
        </div>

        {/* Results */}
        {apiError ? (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-8 text-center">
            <p className="text-orange-600 font-medium">Unable to load shows. Please try again shortly.</p>
          </div>
        ) : filteredShows.length === 0 ? (
          <EmptyState
            title="No shows found"
            description="Try a different category or filter."
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
        ) : isFiltered ? (
          <>
            <div className="mb-6 text-sm text-text-muted">
              {filteredShows.length} show{filteredShows.length !== 1 ? "s" : ""} found
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredShows.map((show) => (
                <ShowCard key={show.id} show={show} />
              ))}
            </div>
          </>
        ) : (
          /* Grouped by category — default view */
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
        )}
      </div>
    </div>
  );
}
