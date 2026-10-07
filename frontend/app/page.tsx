import Link from "next/link";
import { ArrowRight, Zap, Trophy, TrendingUp } from "lucide-react";
import { getShows } from "@/lib/api";
import { ShowCard } from "@/components/ui/ShowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

const features = [
  {
    icon: "🗳️",
    title: "Live Voting",
    description: "Vote for your favorites in real time and see results update instantly",
    color: "from-brand-purple to-brand-purple-light",
    href: "/vote",
  },
  {
    icon: "⚔️",
    title: "Fan Wars",
    description: "Battle other fanbases and prove your fandom is the strongest",
    color: "from-brand-pink to-brand-orange",
    href: "/wars",
  },
  {
    icon: "📊",
    title: "Daily Polls",
    description: "Share your opinions and see where you stand among millions of fans",
    color: "from-brand-orange to-brand-yellow",
    href: "/polls",
  },
  {
    icon: "🏆",
    title: "Leaderboard",
    description: "Climb the ranks and become the top fan in your favorite show",
    color: "from-brand-purple to-brand-pink",
    href: "/leaderboard",
  },
  {
    icon: "💬",
    title: "Discussions",
    description: "Deep dive into episode breakdowns and fan theories",
    color: "from-emerald-400 to-teal-500",
    href: "/discuss",
  },
  {
    icon: "📰",
    title: "Latest Updates",
    description: "Never miss a moment with real-time updates and breaking news",
    color: "from-blue-500 to-indigo-500",
    href: "/news",
  },
];

const stats = [
  { value: "2M+", label: "Active Fans" },
  { value: "50+", label: "Shows" },
  { value: "10M+", label: "Votes Cast" },
  { value: "500K+", label: "Fan Warriors" },
];

import type { Show } from "@/types";

export default async function HomePage() {
  let shows: Show[] = [];
  let liveShows: Show[] = [];
  let apiError = false;

  try {
    shows = await getShows();
    liveShows = shows.filter((s) => s.status === "live");
  } catch {
    apiError = true;
    // Use empty arrays — page still renders with mock structure
  }

  const featuredShows = shows.slice(0, 6);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/3 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="text-center max-w-4xl mx-auto">
            {/* Pre-headline */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 backdrop-blur-sm rounded-full border border-white/20 mb-8">
              <Zap className="w-4 h-4 text-yellow-300" fill="currentColor" />
              <span className="text-sm font-semibold text-white">
                The Ultimate Fan Platform
              </span>
              {liveShows.length > 0 && (
                <Badge variant="live">{liveShows.length} Live Now</Badge>
              )}
            </div>

            {/* Main headline */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white leading-[1.05] tracking-tight mb-6">
              FANDOMS
              <br />
              <span className="relative inline-block">
                BATTLE
                <span className="absolute bottom-0 left-0 w-full h-1 bg-brand-orange rounded-full opacity-70" />
              </span>
              <br />
              HERE
            </h1>

            {/* Tagline */}
            <p className="text-xl sm:text-2xl text-white/80 font-medium mb-4">
              Vote • Support • Discuss • Climb the Leaderboard
            </p>
            <p className="text-base text-white/60 max-w-2xl mx-auto mb-10">
              Join millions of fans voting for their favorites across Reality TV, Music,
              Sports, and more. Your vote matters. Your fandom wins.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/shows">
                <Button
                  size="xl"
                  className="bg-white text-brand-purple hover:bg-white/90 hover:shadow-xl hover:scale-105 font-black"
                >
                  Explore Shows
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/shows?filter=live">
                <Button
                  size="xl"
                  className="bg-white/15 text-white border border-white/30 hover:bg-white/25 backdrop-blur-sm"
                >
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse-live" />
                  Vote Live Now
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl sm:text-4xl font-black text-white">{stat.value}</div>
                  <div className="text-sm text-white/60 mt-1 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Wave separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path d="M0 80L1440 80L1440 20C1200 60 960 0 720 20C480 40 240 0 0 20L0 80Z" fill="#F8F7FF" />
          </svg>
        </div>
      </section>

      {/* Trending Shows */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <SectionHeader
          title="Trending Shows"
          subtitle="The hottest shows right now"
          gradient
          action={
            <Link href="/shows" className="text-sm font-semibold text-brand-purple flex items-center gap-1 hover:gap-2 transition-all">
              See All <ArrowRight className="w-4 h-4" />
            </Link>
          }
        />

        {apiError ? (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-8 text-center">
            <p className="text-orange-600 font-medium">
              Backend not connected yet — shows will appear here once the API is running.
            </p>
          </div>
        ) : featuredShows.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredShows.map((show) => (
              <ShowCard key={show.id} show={show} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-card h-64 bg-gradient-card animate-pulse" />
            ))}
          </div>
        )}
      </section>

      {/* Features Grid */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-text-primary mb-3">
              Everything for the{" "}
              <span className="bg-gradient-brand bg-clip-text text-transparent">Ultimate Fan</span>
            </h2>
            <p className="text-text-muted max-w-2xl mx-auto">
              One platform for all your fan engagement needs
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Link key={feature.title} href={feature.href} className="group">
                <div className="bg-surface-secondary rounded-2xl p-6 hover:bg-white hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200 h-full">
                  <div
                    className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-sm group-hover:scale-110 transition-transform`}
                  >
                    {feature.icon}
                  </div>
                  <h3 className="font-bold text-lg text-text-primary mb-2 group-hover:text-brand-purple transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-text-muted leading-relaxed">{feature.description}</p>
                  <div className="flex items-center gap-1 mt-4 text-xs font-semibold text-brand-purple opacity-0 group-hover:opacity-100 transition-opacity">
                    Explore <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Live Shows Strip */}
      {liveShows.length > 0 && (
        <section className="bg-gradient-hero py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500 rounded-full">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse-live" />
                <span className="text-xs font-bold text-white">LIVE NOW</span>
              </div>
              <span className="text-white/80 text-sm">{liveShows.length} shows accepting votes</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveShows.map((show) => (
                <ShowCard key={show.id} show={show} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="relative overflow-hidden bg-gradient-hero rounded-3xl p-8 sm:p-12 text-center shadow-brand-lg">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              Your Fandom Needs You
            </h2>
            <p className="text-white/80 mb-8 max-w-2xl mx-auto">
              Join millions of fans. Every vote counts. Every discussion shapes the narrative.
              Start your fan journey today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/shows">
                <Button
                  size="lg"
                  className="bg-white text-brand-purple hover:bg-white/90 font-bold hover:scale-105"
                >
                  Browse All Shows
                  <TrendingUp className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/shows?filter=live">
                <Button
                  size="lg"
                  className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-brand-purple font-bold"
                >
                  <Trophy className="w-4 h-4" />
                  Join Fan War
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
