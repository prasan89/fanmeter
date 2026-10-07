import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Flame, Tv2, Music, Trophy, Star } from "lucide-react";
import { getShows, getSeasonContestants, getShowSeasons } from "@/lib/api";
import { ShowCard } from "@/components/ui/ShowCard";
import { ContestantCard } from "@/components/ui/ContestantCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import type { Show, Contestant } from "@/types";
import { categoryLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "FanClash — Where Fandoms Battle",
  description:
    "FanClash is the ultimate fan engagement platform for Reality TV, Music, Sports and K-pop. Vote for your favorites, track contestants, and join the fan war.",
  openGraph: {
    title: "FanClash — Where Fandoms Battle",
    description:
      "Vote. Support. Discuss. Climb the leaderboard. Join millions of fans on FanClash.",
  },
};

const CATEGORIES = [
  { slug: "reality-tv", label: "Reality TV", icon: "📺", color: "from-purple-500 to-pink-500" },
  { slug: "music", label: "Music", icon: "🎵", color: "from-pink-500 to-orange-500" },
  { slug: "sports", label: "Sports", icon: "⚽", color: "from-blue-500 to-cyan-500" },
  { slug: "k-pop", label: "K-pop", icon: "🎤", color: "from-rose-500 to-pink-400" },
  { slug: "cricket", label: "Cricket", icon: "🏏", color: "from-green-500 to-teal-500" },
  { slug: "entertainment", label: "Entertainment", icon: "🎬", color: "from-orange-500 to-yellow-500" },
];

export default async function HomePage() {
  let shows: Show[] = [];
  let featuredContestants: Contestant[] = [];

  try {
    shows = await getShows();
  } catch {
    // API down — renders skeleton gracefully
  }

  const liveShows = shows.filter((s) => s.status === "live");
  const trendingShows = [...liveShows, ...shows.filter((s) => s.status !== "live")].slice(0, 8);
  const featuredShow = liveShows[0] ?? shows[0];

  // Fetch featured contestants from the first live show
  if (featuredShow) {
    try {
      const seasons = await getShowSeasons(featuredShow.slug);
      if (seasons.length > 0) {
        const activeSeason = seasons.find((s) => s.status === "live") ?? seasons[0];
        const all = await getSeasonContestants(activeSeason.id);
        featuredContestants = all.filter((c) => c.status === "active").slice(0, 5);
      }
    } catch {
      // No contestants — graceful
    }
  }

  return (
    <div className="min-h-screen">
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-40 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-28 md:pt-24 md:pb-36">
          <div className="max-w-3xl">
            {/* Live badge */}
            {liveShows.length > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/20 backdrop-blur-sm rounded-full border border-red-400/30 mb-6">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse-live" />
                <span className="text-sm font-semibold text-white">
                  {liveShows.length} Show{liveShows.length !== 1 ? "s" : ""} Live Now
                </span>
              </div>
            )}

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white leading-[1.05] tracking-tight mb-4">
              FANDOMS
              <br />
              <span className="relative">
                BATTLE
                <span className="absolute -bottom-1 left-0 w-full h-1 bg-brand-orange rounded-full" />
              </span>
              <br />
              HERE
            </h1>

            <p className="text-lg sm:text-xl text-white/75 font-medium mt-6 mb-8">
              Vote · Support · Discuss · Climb the Leaderboard
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/shows"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white text-brand-purple font-black rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all text-base"
              >
                Explore Shows
                <ArrowRight className="w-5 h-5" />
              </Link>
              {liveShows.length > 0 && (
                <Link
                  href="/shows?status=live"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white/15 text-white font-semibold rounded-2xl border border-white/30 hover:bg-white/25 backdrop-blur-sm transition-all text-base"
                >
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse-live" />
                  Vote Live Now
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" preserveAspectRatio="none">
            <path d="M0 80L1440 80L1440 20C1200 60 960 0 720 20C480 40 240 0 0 20L0 80Z" fill="#F8F7FF" />
          </svg>
        </div>
      </section>

      {/* ===== TRENDING SHOWS ===== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <SectionHeader
          title="🔥 Trending Shows"
          subtitle="The hottest shows right now"
          gradient
          action={
            <Link href="/shows" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-purple hover:gap-2 transition-all">
              See All <ArrowRight className="w-4 h-4" />
            </Link>
          }
        />

        {trendingShows.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {trendingShows.map((show) => (
              <ShowCard key={show.id} show={show} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-card h-56 animate-pulse">
                <div className="h-48 bg-gradient-card" />
                <div className="p-4">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== LIVE NOW STRIP ===== */}
      {liveShows.length > 0 && (
        <section className="bg-gradient-hero py-12 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          </div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500 rounded-full shadow-md">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse-live" />
                <span className="text-xs font-black text-white tracking-wide">LIVE NOW</span>
              </div>
              <span className="text-white/70 text-sm font-medium">
                {liveShows.length} show{liveShows.length !== 1 ? "s" : ""} accepting votes right now
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {liveShows.slice(0, 3).map((show) => (
                <ShowCard key={show.id} show={show} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== DISCOVERY CATEGORIES ===== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <SectionHeader
          title="Browse by Category"
          subtitle="Find your fandom"
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {CATEGORIES.map((cat) => {
            const count = shows.filter((s) => s.category === cat.slug).length;
            return (
              <Link
                key={cat.slug}
                href={`/shows?category=${cat.slug}`}
                className="group bg-white rounded-2xl p-5 text-center shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200"
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${cat.color} rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 shadow-sm group-hover:scale-110 transition-transform`}>
                  {cat.icon}
                </div>
                <div className="font-bold text-sm text-text-primary group-hover:text-brand-purple transition-colors">
                  {cat.label}
                </div>
                {count > 0 && (
                  <div className="text-xs text-text-muted mt-0.5">{count} show{count !== 1 ? "s" : ""}</div>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* ===== FEATURED CONTESTANTS ===== */}
      {featuredContestants.length > 0 && featuredShow && (
        <section className="bg-surface-secondary py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader
              title="⭐ Featured Contestants"
              subtitle={`Currently active on ${featuredShow.name}`}
              action={
                <Link
                  href={`/shows/${featuredShow.slug}`}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-brand-purple hover:gap-2 transition-all"
                >
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              }
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {featuredContestants.map((contestant, i) => (
                <ContestantCard
                  key={contestant.id}
                  contestant={contestant}
                  rank={i + 1}
                  showSlug={featuredShow.slug}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== PLATFORM FEATURES ===== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-black text-text-primary mb-3">
            Everything for the{" "}
            <span className="bg-gradient-brand bg-clip-text text-transparent">Ultimate Fan</span>
          </h2>
          <p className="text-text-muted max-w-xl mx-auto">
            One platform for all your fan engagement needs
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: "🗳️", title: "Live Voting", desc: "Vote for your favorites in real time", href: "/vote", color: "from-brand-purple to-brand-purple-light" },
            { icon: "⚔️", title: "Fan Wars", desc: "Battle other fanbases for glory", href: "/wars", color: "from-brand-pink to-brand-orange" },
            { icon: "🏆", title: "Leaderboard", desc: "Climb the ranks, become the top fan", href: "/vote", color: "from-brand-orange to-brand-yellow" },
            { icon: "📊", title: "Season Tracker", desc: "Follow every episode and elimination", href: "/shows", color: "from-blue-500 to-indigo-500" },
          ].map((f) => (
            <Link key={f.title} href={f.href} className="group">
              <div className="bg-white rounded-2xl p-6 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200 h-full">
                <div className={`w-12 h-12 bg-gradient-to-br ${f.color} rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-sm group-hover:scale-110 transition-transform`}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-text-primary mb-1 group-hover:text-brand-purple transition-colors">
                  {f.title}
                </h3>
                <p className="text-sm text-text-muted">{f.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== CTA BANNER ===== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="relative overflow-hidden bg-gradient-hero rounded-3xl p-8 sm:p-14 text-center shadow-brand-lg">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">
              Your Fandom Needs You
            </h2>
            <p className="text-white/75 mb-8 max-w-2xl mx-auto text-lg">
              Join millions of fans. Every vote counts. Every discussion shapes the narrative.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/shows"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-brand-purple font-black rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
              >
                Browse All Shows
                <Flame className="w-4 h-4" />
              </Link>
              <Link
                href="/vote"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-transparent border-2 border-white text-white font-bold rounded-2xl hover:bg-white hover:text-brand-purple transition-all"
              >
                <Trophy className="w-4 h-4" />
                Fan Wars Coming Soon
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
