import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Users, Play, MessageCircle, BarChart2, Sword } from "lucide-react";
import { getShow, getShowSeasons, getSeasonContestants } from "@/lib/api";
import { ContestantCard } from "@/components/ui/ContestantCard";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EmptyState } from "@/components/ui/States";
import { formatDate, categoryLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface ShowPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ShowPageProps) {
  const { slug } = await params;
  try {
    const show = await getShow(slug);
    return {
      title: `${show.name} — FanClash`,
      description: show.description ?? `Follow ${show.name} on FanClash. Vote, discuss, and support your favorites.`,
    };
  } catch {
    return { title: "Show — FanClash" };
  }
}

const navTabs = [
  { id: "contestants", label: "Contestants", icon: Users },
  { id: "episodes", label: "Episodes", icon: Play },
  { id: "polls", label: "Polls", icon: BarChart2 },
  { id: "wars", label: "Fan Wars", icon: Sword },
  { id: "news", label: "News", icon: MessageCircle },
];

import type { Show, Season, Contestant } from "@/types";

export default async function ShowPage({ params }: ShowPageProps) {
  const { slug } = await params;

  let show: Show, seasons: Season[] = [], contestants: Contestant[] | undefined;
  try {
    show = await getShow(slug);
    seasons = await getShowSeasons(slug);
  } catch {
    notFound();
    return; // unreachable but satisfies TypeScript
  }
  // show is guaranteed non-null here due to notFound() above

  const activeSeason = seasons?.find((s) => s.status === "live") ?? seasons?.[0];

  if (activeSeason) {
    try {
      contestants = await getSeasonContestants(activeSeason.id);
    } catch {
      contestants = [];
    }
  }

  const statusVariant =
    show.status === "live" ? "live" : show.status === "upcoming" ? "upcoming" : "completed";

  return (
    <div className="min-h-screen bg-surface-secondary">
      {/* Hero */}
      <div className="relative h-[360px] sm:h-[480px] overflow-hidden">
        {show.imageUrl ? (
          <Image
            src={show.imageUrl}
            alt={show.name}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-hero" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Back button */}
        <div className="absolute top-4 left-4">
          <Link
            href="/shows"
            className="inline-flex items-center gap-2 px-3 py-2 bg-black/30 backdrop-blur-sm text-white rounded-xl text-sm hover:bg-black/50 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            All Shows
          </Link>
        </div>

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end gap-4 sm:gap-6">
              {/* Show thumbnail */}
              <div className="flex-shrink-0 w-20 h-20 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shadow-xl ring-4 ring-white/30">
                {show.imageUrl ? (
                  <Image
                    src={show.imageUrl}
                    alt={show.name}
                    width={112}
                    height={112}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-brand flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">{show.name.charAt(0)}</span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <Badge variant={statusVariant}>
                    {show.status === "live" ? "Live Now" : show.status === "upcoming" ? "Upcoming" : "Ended"}
                  </Badge>
                  <span className="text-white/70 text-sm capitalize">
                    {categoryLabel(show.category)}
                  </span>
                  {activeSeason && (
                    <span className="text-white/70 text-sm">• {activeSeason.name}</span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                  {show.name}
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Show meta */}
        <div className="py-6 flex flex-wrap items-center gap-4 border-b border-gray-200">
          {show.description && (
            <p className="text-text-secondary flex-1 min-w-[200px]">{show.description}</p>
          )}
          <div className="flex items-center gap-4 flex-shrink-0">
            <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-brand text-white font-semibold rounded-xl shadow-brand-sm hover:shadow-brand-lg hover:scale-105 transition-all text-sm">
              Vote Now
            </button>
            {seasons && seasons.length > 1 && (
              <select className="text-sm font-medium text-text-secondary bg-white border border-gray-200 rounded-xl px-3 py-2.5">
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Season info */}
        {activeSeason && (
          <div className="py-4 flex items-center gap-6 flex-wrap text-sm text-text-muted">
            {activeSeason.startDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Started: {formatDate(activeSeason.startDate)}
              </div>
            )}
            {contestants && (
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {contestants.length} Contestants
              </div>
            )}
          </div>
        )}

        {/* Navigation tabs */}
        <div className="flex items-center gap-1 overflow-x-auto py-2 mb-8 scrollbar-hide border-b border-gray-200">
          {navTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                id === "contestants"
                  ? "text-brand-purple bg-brand-purple/10 border-b-2 border-brand-purple -mb-px"
                  : "text-text-secondary hover:text-brand-purple hover:bg-surface-tertiary"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Contestants Grid */}
        <div className="pb-16">
          <SectionHeader
            title={`${activeSeason?.name ?? "Season"} Contestants`}
            subtitle={contestants ? `${contestants.filter((c) => c.status === "active").length} still in the house` : undefined}
          />

          {!contestants || contestants.length === 0 ? (
            <EmptyState
              title="No contestants yet"
              description="Contestants will be announced soon. Stay tuned!"
              icon="🎭"
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
              {contestants.map((contestant, index) => (
                <ContestantCard
                  key={contestant.id}
                  contestant={contestant}
                  rank={index + 1}
                />
              ))}
            </div>
          )}
        </div>

        {/* Coming Soon Sections */}
        <div className="pb-16 space-y-6">
          {[
            { title: "Live Voting", icon: "🗳️", description: "Vote for your favorites — coming in M2" },
            { title: "Fan Wars", icon: "⚔️", description: "Battle other fanbases — coming in M2" },
            { title: "Discussions", icon: "💬", description: "Join the conversation — coming in M2" },
            { title: "Latest News", icon: "📰", description: "Breaking updates — coming in M2" },
          ].map((section) => (
            <div key={section.title} className="bg-white rounded-2xl p-8 text-center border border-dashed border-purple-200">
              <div className="text-4xl mb-3">{section.icon}</div>
              <h3 className="font-bold text-text-primary mb-1">{section.title}</h3>
              <p className="text-sm text-text-muted">{section.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
