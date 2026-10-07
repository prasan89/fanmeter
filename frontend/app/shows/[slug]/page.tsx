import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Users, Play, Clock, ChevronRight } from "lucide-react";
import { getShow, getShowSeasons, getSeasonContestants, getSeasonEpisodes } from "@/lib/api";
import { ContestantCard } from "@/components/ui/ContestantCard";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EmptyState } from "@/components/ui/States";
import { formatDate, categoryLabel } from "@/lib/utils";
import type { Show, Season, Contestant, Episode } from "@/types";

export const dynamic = "force-dynamic";

interface ShowPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ season?: string }>;
}

export async function generateMetadata({ params }: ShowPageProps) {
  const { slug } = await params;
  try {
    const show = await getShow(slug);
    return {
      title: `${show.name} — FanClash`,
      description:
        show.description ??
        `Follow ${show.name} on FanClash. Explore seasons, episodes, and contestants.`,
      openGraph: {
        title: `${show.name} — FanClash`,
        description:
          show.description ??
          `Follow ${show.name} on FanClash. Explore seasons, episodes, and contestants.`,
        images: show.imageUrl ? [show.imageUrl] : [],
      },
    };
  } catch {
    return { title: "Show — FanClash" };
  }
}

export default async function ShowPage({ params, searchParams }: ShowPageProps) {
  const { slug } = await params;
  const { season: seasonParam } = await searchParams;

  let show: Show, seasons: Season[] = [];
  try {
    show = await getShow(slug);
    seasons = await getShowSeasons(slug);
  } catch {
    notFound();
    return;
  }

  const activeSeason = seasonParam
    ? (seasons.find((s) => s.id === Number(seasonParam)) ?? seasons.find((s) => s.status === "live") ?? seasons[0])
    : (seasons.find((s) => s.status === "live") ?? seasons[0]);

  let contestants: Contestant[] = [];
  let episodes: Episode[] = [];

  if (activeSeason) {
    const [c, e] = await Promise.allSettled([
      getSeasonContestants(activeSeason.id),
      getSeasonEpisodes(activeSeason.id),
    ]);
    contestants = c.status === "fulfilled" ? c.value : [];
    episodes = e.status === "fulfilled" ? e.value : [];
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

        <div className="absolute top-4 left-4">
          <Link
            href="/shows"
            className="inline-flex items-center gap-2 px-3 py-2 bg-black/30 backdrop-blur-sm text-white rounded-xl text-sm hover:bg-black/50 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            All Shows
          </Link>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end gap-4 sm:gap-6">
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
                  <span className="text-white/70 text-sm capitalize">{categoryLabel(show.category)}</span>
                  {show.language && (
                    <span className="text-white/60 text-sm">• {show.language}</span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">{show.name}</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Show meta + season switcher */}
        <div className="py-6 flex flex-wrap items-start gap-4 border-b border-gray-200">
          <div className="flex-1 min-w-[200px]">
            {show.description && (
              <p className="text-text-secondary">{show.description}</p>
            )}
            {activeSeason?.description && (
              <p className="mt-2 text-sm text-text-muted">{activeSeason.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {seasons.length > 1 && (
              <div className="flex items-center gap-1 bg-surface-secondary rounded-xl p-1">
                {seasons.map((s) => (
                  <Link
                    key={s.id}
                    href={`/shows/${slug}?season=${s.id}`}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                      s.id === activeSeason?.id
                        ? "bg-white text-brand-purple shadow-sm"
                        : "text-text-secondary hover:text-brand-purple"
                    }`}
                  >
                    {s.name}
                  </Link>
                ))}
              </div>
            )}
            <Link
              href="/vote"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-brand text-white font-semibold rounded-xl shadow-brand-sm hover:shadow-brand-lg hover:scale-105 transition-all text-sm"
            >
              Vote Now
            </Link>
          </div>
        </div>

        {/* Season meta */}
        {activeSeason && (
          <div className="py-4 flex items-center gap-6 flex-wrap text-sm text-text-muted border-b border-gray-100">
            {activeSeason.startDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Started: {formatDate(activeSeason.startDate)}
              </div>
            )}
            {activeSeason.endDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Ends: {formatDate(activeSeason.endDate)}
              </div>
            )}
            {contestants.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {contestants.length} Contestants
              </div>
            )}
            {episodes.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Play className="w-4 h-4" />
                {episodes.length} Episodes
              </div>
            )}
          </div>
        )}

        {/* Episodes Section */}
        {activeSeason && (
          <div className="py-10">
            <SectionHeader
              title="Episodes"
              subtitle={episodes.length > 0 ? `${episodes.length} episodes this season` : undefined}
              action={
                episodes.length > 6 ? (
                  <span className="text-sm font-semibold text-brand-purple">
                    Showing latest 6
                  </span>
                ) : undefined
              }
            />

            {episodes.length === 0 ? (
              <EmptyState
                title="No episodes yet"
                description="Episodes will appear here as they air."
                icon="🎬"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {episodes.slice(0, 6).map((episode) => (
                  <Link
                    key={episode.id}
                    href={`/shows/${slug}/episodes/${episode.id}`}
                    className="group bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200"
                  >
                    <div className="relative h-40 bg-gradient-card overflow-hidden">
                      {episode.thumbnail ? (
                        <Image
                          src={episode.thumbnail}
                          alt={episode.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 100vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-warm flex items-center justify-center">
                          <Play className="w-10 h-10 text-white/60" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute top-3 left-3">
                        <Badge
                          variant={
                            episode.status === "live"
                              ? "live"
                              : episode.status === "upcoming"
                              ? "upcoming"
                              : "completed"
                          }
                        >
                          {episode.status === "live" ? "Live" : episode.status === "upcoming" ? "Upcoming" : "Aired"}
                        </Badge>
                      </div>
                      <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-lg">
                        Ep {episode.episodeNumber}
                      </div>
                    </div>
                    <div className="p-4">
                      <h4 className="font-bold text-text-primary group-hover:text-brand-purple transition-colors line-clamp-1">
                        {episode.title}
                      </h4>
                      <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                        {episode.airDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(episode.airDate)}
                          </span>
                        )}
                        {episode.durationMinutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {episode.durationMinutes}m
                          </span>
                        )}
                      </div>
                      {episode.description && (
                        <p className="mt-2 text-xs text-text-muted line-clamp-2">{episode.description}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {episodes.length > 6 && (
              <div className="mt-6 text-center">
                <Link
                  href={`/shows/${slug}/episodes`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-brand-purple/30 text-brand-purple font-semibold rounded-xl hover:bg-brand-purple hover:text-white transition-all text-sm"
                >
                  View All {episodes.length} Episodes
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Contestants Grid */}
        <div className="pb-16">
          <SectionHeader
            title={`${activeSeason?.name ?? "Season"} Contestants`}
            subtitle={
              contestants.length > 0
                ? `${contestants.filter((c) => c.status === "active").length} still active`
                : undefined
            }
          />

          {contestants.length === 0 ? (
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
                  showSlug={slug}
                />
              ))}
            </div>
          )}
        </div>

        {/* Coming Soon: Fan Wars */}
        <div className="pb-16 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/vote" className="group">
            <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-purple-200 hover:border-brand-purple hover:shadow-card transition-all">
              <div className="text-4xl mb-3">🗳️</div>
              <h3 className="font-bold text-text-primary mb-1 group-hover:text-brand-purple transition-colors">
                Live Voting
              </h3>
              <p className="text-sm text-text-muted">Vote for your favorites — coming soon</p>
            </div>
          </Link>
          <Link href="/wars" className="group">
            <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-pink-200 hover:border-brand-pink hover:shadow-card transition-all">
              <div className="text-4xl mb-3">⚔️</div>
              <h3 className="font-bold text-text-primary mb-1 group-hover:text-brand-pink transition-colors">
                Fan Wars
              </h3>
              <p className="text-sm text-text-muted">Battle other fanbases — coming soon</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
