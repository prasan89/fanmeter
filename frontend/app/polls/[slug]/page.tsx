import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Vote, AlertCircle, ArrowLeft, Users, TrendingUp } from "lucide-react";
import { getShowSeasons, getActiveRound } from "@/lib/api";

export const dynamic = "force-dynamic";

interface PollPageProps {
  params: Promise<{ slug: string }>;
}

const SHOW_MAP: Record<string, { label: string; gradientFrom: string; gradientTo: string; accentBorder: string; accentText: string }> = {
  "bigg-boss-tamil": {
    label: "Bigg Boss Tamil 10",
    gradientFrom: "from-violet-600",
    gradientTo: "to-pink-500",
    accentBorder: "border-violet-200",
    accentText: "text-violet-700",
  },
  "bigg-boss-telugu": {
    label: "Bigg Boss Telugu 10",
    gradientFrom: "from-blue-600",
    gradientTo: "to-violet-600",
    accentBorder: "border-blue-200",
    accentText: "text-blue-700",
  },
};

export async function generateMetadata({ params }: PollPageProps): Promise<Metadata> {
  const { slug } = await params;
  const show = SHOW_MAP[slug];
  if (!show) return { title: "Poll — FanMeter" };
  return {
    title: `${show.label} Fan Poll — FanMeter`,
    description: `Vote in the current ${show.label} community poll on FanMeter. Not an official broadcaster vote.`,
    openGraph: {
      title: `${show.label} Fan Poll — FanMeter`,
      description: `Community fan poll for ${show.label}.`,
    },
  };
}

export default async function PollPage({ params }: PollPageProps) {
  const { slug } = await params;
  const show = SHOW_MAP[slug];
  if (!show) notFound();

  let round = null;
  try {
    const seasons = await getShowSeasons(slug);
    const live = seasons.find((s) => s.status === "live") ?? seasons[0];
    if (live) round = await getActiveRound(live.id);
  } catch {
    // No active round
  }

  const results = round?.results ?? [];
  const totalVotes = results.reduce((sum, r) => sum + r.voteCount, 0);

  function formatDeadline(closesAt: string | null): string | null {
    if (!closesAt) return null;
    const d = new Date(closesAt);
    return d.toLocaleDateString("en-IN", {
      weekday: "short", day: "numeric", month: "short",
      hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
    }) + " IST";
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Back */}
        <Link
          href="/polls"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-violet-600 transition-colors mb-5"
        >
          <ArrowLeft className="w-4 h-4" />
          All Polls
        </Link>

        {/* Poll card */}
        <div className={`bg-white rounded-2xl border ${show.accentBorder} shadow-sm overflow-hidden`}>
          {/* Header */}
          <div className={`px-5 py-5 bg-gradient-to-r ${show.gradientFrom} ${show.gradientTo}`}>
            <p className="text-white/70 text-xs font-semibold uppercase tracking-wide mb-1">{show.label}</p>
            <h1 className="text-xl font-black text-white">
              {round ? round.title : "No Active Poll"}
            </h1>
            {round?.status === "open" && round.closesAt && (
              <p className="text-white/70 text-xs mt-1">
                Closes {formatDeadline(round.closesAt)}
              </p>
            )}
          </div>

          <div className="p-5">
            {round ? (
              <>
                {/* Stats */}
                <div className="flex items-center gap-4 mb-5 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    {results.length} contestants
                  </span>
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" />
                    {totalVotes.toLocaleString()} total votes
                  </span>
                  {round.status === "open" && (
                    <span className="flex items-center gap-1 text-green-600 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-[pulseLive_2s_infinite]" />
                      Open
                    </span>
                  )}
                </div>

                {/* Full results */}
                <div className="space-y-3 mb-6">
                  {results.map((c) => {
                    const pct = totalVotes > 0
                      ? ((c.voteCount / totalVotes) * 100).toFixed(1)
                      : "0.0";
                    const barPct = results[0]?.voteCount > 0
                      ? Math.round((c.voteCount / results[0].voteCount) * 100)
                      : 0;

                    return (
                      <div key={c.contestantId} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-400 w-5 text-right flex-shrink-0">
                          #{c.rank}
                        </span>
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 relative">
                          {c.profileImage ? (
                            <Image
                              src={c.profileImage}
                              alt={c.contestantName}
                              fill
                              className="object-cover"
                              sizes="36px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">
                              {c.contestantName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-gray-900 truncate">{c.contestantName}</span>
                            <span className="text-sm font-bold text-gray-700 ml-2 flex-shrink-0">{pct}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${show.gradientFrom} ${show.gradientTo}`}
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {c.voteCount.toLocaleString()} votes
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Vote CTA */}
                {round.status === "open" && (
                  <Link
                    href={`/vote/${slug}`}
                    className={`flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r ${show.gradientFrom} ${show.gradientTo} text-white font-bold rounded-xl text-sm hover:shadow hover:scale-[1.01] transition-all`}
                  >
                    <Vote className="w-4 h-4" />
                    Vote in This Poll
                  </Link>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <Vote className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium mb-1">No active poll right now</p>
                <p className="text-sm text-gray-400">Check back during the next eviction week.</p>
              </div>
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-3 p-4 mt-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            This is an independent FanMeter community poll. Results do not affect official Bigg Boss evictions.
          </p>
        </div>
      </div>
    </div>
  );
}
