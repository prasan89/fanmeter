import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { getShows, getSeasonContestants, getShowSeasons } from "@/lib/api";
import { ShowCard } from "@/components/ui/ShowCard";
import { ContestantCard } from "@/components/ui/ContestantCard";
import type { Show, Contestant } from "@/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "FanClash — Where Fandoms Battle",
  description: "Vote for your favorites, track contestants, and join the fan war.",
};

const CATEGORIES = [
  { slug: "reality-tv", label: "Reality TV", icon: "📺" },
  { slug: "music",      label: "Music",      icon: "🎵" },
  { slug: "sports",     label: "Sports",     icon: "⚽" },
  { slug: "k-pop",      label: "K-pop",      icon: "🎤" },
  { slug: "cricket",    label: "Cricket",    icon: "🏏" },
  { slug: "entertainment", label: "Entertainment", icon: "🎬" },
];

export default async function HomePage() {
  let shows: Show[] = [];
  let featuredContestants: Contestant[] = [];

  try { shows = await getShows(); } catch { /* offline */ }

  const liveShows = shows.filter((s) => s.status === "live");
  const trendingShows = [...liveShows, ...shows.filter((s) => s.status !== "live")].slice(0, 3);
  const featuredShow = liveShows[0] ?? shows[0];

  if (featuredShow) {
    try {
      const seasons = await getShowSeasons(featuredShow.slug);
      if (seasons.length > 0) {
        const season = seasons.find((s) => s.status === "live") ?? seasons[0];
        const all = await getSeasonContestants(season.id);
        featuredContestants = all.filter((c) => c.status === "active").slice(0, 5);
      }
    } catch { /* no contestants */ }
  }

  return (
    <div className="min-h-screen">

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-purple-600 to-pink-500 px-6 pt-16 pb-28 sm:px-10 md:pt-24 md:pb-36">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl">
          {liveShows.length > 0 && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-400/30 rounded-full mb-6">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-[pulseLive_2s_infinite]" />
              <span className="text-sm font-semibold text-white">
                {liveShows.length} Show{liveShows.length !== 1 ? "s" : ""} Live Now
              </span>
            </div>
          )}

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight tracking-tight mb-4">
            FANDOMS<br />
            <span className="relative inline-block">
              BATTLE
              <span className="absolute -bottom-1 left-0 w-full h-1 bg-orange-400 rounded-full" />
            </span>
            <br />HERE
          </h1>

          <p className="text-lg text-white/75 mt-6 mb-8">Vote · Support · Discuss · Climb the Leaderboard</p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/shows" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white text-violet-700 font-black rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all text-base">
              Explore Shows <ArrowRight className="w-5 h-5" />
            </Link>
            {liveShows.length > 0 && (
              <Link href="/shows?status=live" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white/15 text-white font-semibold rounded-2xl border border-white/30 hover:bg-white/25 transition-all text-base">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-[pulseLive_2s_infinite]" />
                Vote Live Now
              </Link>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" preserveAspectRatio="none">
            <path d="M0 80L1440 80L1440 20C1200 60 960 0 720 20C480 40 240 0 0 20L0 80Z" fill="#F8F7FF" />
          </svg>
        </div>
      </section>

      {/* TRENDING SHOWS */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Flame className="w-6 h-6 text-orange-500" /> Trending Shows
            </h2>
            <p className="text-sm text-gray-400 mt-1">The hottest shows right now</p>
          </div>
          <Link href="/shows" className="inline-flex items-center gap-1 text-sm font-semibold text-violet-600 hover:gap-2 transition-all">
            See All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {trendingShows.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {trendingShows.map((show) => <ShowCard key={show.id} show={show} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3].map((i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow h-64 animate-pulse">
                <div className="h-48 bg-gray-100" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FEATURED CONTESTANTS */}
      {featuredContestants.length > 0 && featuredShow && (
        <section className="bg-violet-50 py-12">
          <div className="max-w-7xl mx-auto px-6 sm:px-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-gray-900">⭐ Featured Contestants</h2>
                <p className="text-sm text-gray-400 mt-1">Currently active on {featuredShow.name}</p>
              </div>
              <Link href={`/shows/${featuredShow.slug}`} className="inline-flex items-center gap-1 text-sm font-semibold text-violet-600 hover:gap-2 transition-all">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {featuredContestants.map((c, i) => (
                <ContestantCard key={c.id} contestant={c} rank={i + 1} showSlug={featuredShow.slug} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CATEGORIES */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 py-12">
        <h2 className="text-2xl font-black text-gray-900 mb-2">Browse by Category</h2>
        <p className="text-sm text-gray-400 mb-6">Find your fandom</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {CATEGORIES.map((cat) => {
            const count = shows.filter((s) => s.category === cat.slug).length;
            return (
              <Link key={cat.slug} href={`/shows?category=${cat.slug}`}
                className="bg-white rounded-2xl p-5 text-center shadow hover:shadow-md hover:-translate-y-1 transition-all duration-200 group">
                <div className="text-3xl mb-2">{cat.icon}</div>
                <div className="font-bold text-sm text-gray-900 group-hover:text-violet-600 transition-colors">{cat.label}</div>
                {count > 0 && <div className="text-xs text-gray-400 mt-0.5">{count} show{count !== 1 ? "s" : ""}</div>}
              </Link>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 pb-14">
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-purple-600 to-pink-500 rounded-3xl p-8 sm:p-14 text-center shadow-2xl">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">Your Fandom Needs You</h2>
            <p className="text-white/75 mb-8 max-w-xl mx-auto text-lg">Join millions of fans. Every vote counts.</p>
            <Link href="/shows" className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-violet-700 font-black rounded-2xl shadow-xl hover:scale-105 transition-all">
              Browse All Shows <Flame className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
