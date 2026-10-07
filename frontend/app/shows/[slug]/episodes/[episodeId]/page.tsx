import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Clock, Play } from "lucide-react";
import { getEpisode, getSeason, getShow } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface EpisodePageProps {
  params: Promise<{ slug: string; episodeId: string }>;
}

export async function generateMetadata({ params }: EpisodePageProps) {
  const { slug, episodeId } = await params;
  try {
    const episode = await getEpisode(Number(episodeId));
    return {
      title: `${episode.title} — FanClash`,
      description: episode.description ?? `Watch episode ${episode.episodeNumber}: ${episode.title} on FanClash.`,
      openGraph: {
        title: `${episode.title} — FanClash`,
        description: episode.description ?? `Watch episode ${episode.episodeNumber}: ${episode.title} on FanClash.`,
        images: episode.thumbnail ? [episode.thumbnail] : [],
      },
    };
  } catch {
    return { title: `Episode — FanClash` };
  }
}

export default async function EpisodePage({ params }: EpisodePageProps) {
  const { slug, episodeId } = await params;

  let episode, season, show;
  try {
    episode = await getEpisode(Number(episodeId));
    season = await getSeason(episode.seasonId);
    show = await getShow(slug);
  } catch {
    notFound();
    return;
  }

  const statusVariant =
    episode.status === "live" ? "live" : episode.status === "upcoming" ? "upcoming" : "completed";

  return (
    <div className="min-h-screen bg-surface-secondary">
      {/* Hero thumbnail */}
      <div className="relative h-[280px] sm:h-[420px] overflow-hidden">
        {episode.thumbnail ? (
          <Image
            src={episode.thumbnail}
            alt={episode.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-hero flex items-center justify-center">
            <Play className="w-16 h-16 text-white/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        <div className="absolute top-4 left-4">
          <Link
            href={`/shows/${slug}`}
            className="inline-flex items-center gap-2 px-3 py-2 bg-black/30 backdrop-blur-sm text-white rounded-xl text-sm hover:bg-black/50 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            {show.name}
          </Link>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <Badge variant={statusVariant}>
                {episode.status === "live" ? "Live" : episode.status === "upcoming" ? "Upcoming" : "Aired"}
              </Badge>
              <span className="text-white/70 text-sm">Episode {episode.episodeNumber}</span>
              <span className="text-white/50 text-sm">• {season.name}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">{episode.title}</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Meta bar */}
        <div className="flex flex-wrap items-center gap-4 pb-6 border-b border-gray-200 text-sm text-text-muted">
          {episode.airDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {formatDate(episode.airDate)}
            </div>
          )}
          {episode.durationMinutes && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {episode.durationMinutes} minutes
            </div>
          )}
          <Link
            href={`/shows/${slug}`}
            className="ml-auto text-brand-purple font-medium hover:underline text-sm"
          >
            All Episodes →
          </Link>
        </div>

        {/* Description */}
        {episode.description ? (
          <div className="py-8">
            <h2 className="text-lg font-bold text-text-primary mb-3">About This Episode</h2>
            <p className="text-text-secondary leading-relaxed">{episode.description}</p>
          </div>
        ) : (
          <div className="py-12 text-center text-text-muted">
            <Play className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Episode details coming soon.</p>
          </div>
        )}

        {/* Coming soon voting */}
        <div className="mt-4 bg-white rounded-2xl p-8 text-center border border-dashed border-purple-200">
          <div className="text-4xl mb-3">🗳️</div>
          <h3 className="font-bold text-text-primary mb-1">Live Voting</h3>
          <p className="text-sm text-text-muted">Vote on this episode&apos;s highlights — coming soon</p>
          <Link
            href="/vote"
            className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-gradient-brand text-white font-semibold rounded-xl text-sm hover:shadow-brand-lg hover:scale-105 transition-all"
          >
            Get Notified
          </Link>
        </div>
      </div>
    </div>
  );
}
