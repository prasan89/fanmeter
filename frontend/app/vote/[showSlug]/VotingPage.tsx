"use client";

import { use, useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Share2, Clock, AlertCircle, Search } from "lucide-react";
import { getActiveRound, castVote } from "@/lib/api";
import type { VotingRoundDto, ContestantVoteDto } from "@/types";
import { TwoColumnLayout } from "@/components/layout/TwoColumnLayout";
import { AdSidebar } from "@/components/ads/AdSidebar";

const KNOWN_SHOWS: Record<string, { name: string; shortName: string; accentColor: string; barColor: string; btnColor: string }> = {
  "bigg-boss-tamil":  {
    name: "Bigg Boss Tamil 10",
    shortName: "Tamil 10",
    accentColor: "text-red-500",
    barColor: "bg-red-500",
    btnColor: "bg-red-500 hover:bg-red-600",
  },
  "bigg-boss-telugu": {
    name: "Bigg Boss Telugu 10",
    shortName: "Telugu 10",
    accentColor: "text-blue-600",
    barColor: "bg-blue-500",
    btnColor: "bg-blue-600 hover:bg-blue-700",
  },
};

const SEASON_IDS: Record<string, number> = {
  "bigg-boss-tamil":  6,
  "bigg-boss-telugu": 7,
};

type Tab = "vote" | "rankings" | "contestants" | "episodes" | "fan-polls";

function getOrCreateVoterKey(): string {
  const key = "fanmeter_voter_key";
  let stored = localStorage.getItem(key);
  if (!stored) {
    stored = localStorage.getItem("fanclash_voter_key") ?? ("fmk_" + crypto.randomUUID().replace(/-/g, ""));
    localStorage.setItem(key, stored);
  }
  return stored;
}

function formatCountdown(closesAt: string | null): string | null {
  if (!closesAt) return null;
  const d = new Date(closesAt);
  const diffMs = d.getTime() - Date.now();
  if (diffMs <= 0) return "Closed";
  const days = Math.floor(diffMs / 86400000);
  const hrs  = Math.floor((diffMs % 86400000) / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  if (days > 0) return `${days}d ${hrs}h ${mins}m`;
  if (hrs  > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

type VoteState = "idle" | "voting" | "voted" | "error" | "duplicate";

function ContestantVoteCard({
  c,
  totalVotes,
  voteState,
  voteMessage,
  hasVoted,
  onVote,
  barColor,
  btnColor,
}: {
  c: ContestantVoteDto;
  totalVotes: number;
  voteState: VoteState;
  voteMessage: string | undefined;
  hasVoted: boolean;
  onVote: () => void;
  barColor: string;
  btnColor: string;
}) {
  const pct = totalVotes > 0 ? ((c.voteCount / totalVotes) * 100).toFixed(0) : "0";
  const barWidth = totalVotes > 0 ? Math.round((c.voteCount / totalVotes) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Photo */}
      <div className="relative h-44 bg-gray-100 overflow-hidden">
        {c.profileImage ? (
          <Image
            src={c.profileImage}
            alt={c.contestantName}
            fill
            className="object-cover object-top"
            sizes="(max-width: 640px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-violet-200 to-pink-200 flex items-center justify-center">
            <span className="text-4xl font-black text-white/60">{c.contestantName.charAt(0)}</span>
          </div>
        )}
        {/* Rank badge */}
        <div className="absolute top-2 left-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow-sm">
          <span className="text-xs font-black text-gray-700">#{c.rank}</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-1">
          <p className="font-bold text-gray-900 text-sm truncate">{c.contestantName}</p>
          <span className="text-sm font-black text-gray-900 flex-shrink-0 ml-1">{pct}%</span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full ${barColor} transition-all duration-700`}
            style={{ width: `${barWidth}%` }}
          />
        </div>

        {/* Vote button */}
        <button
          onClick={onVote}
          disabled={hasVoted || voteState === "voting"}
          aria-label={hasVoted ? `Voted for ${c.contestantName}` : `Vote for ${c.contestantName}`}
          className={`w-full py-2 rounded-xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
            hasVoted
              ? "bg-green-100 text-green-700 cursor-default"
              : voteState === "voting"
              ? "bg-gray-100 text-gray-400 cursor-wait"
              : `${btnColor} text-white shadow-sm hover:shadow`
          }`}
        >
          {hasVoted ? "✓ Voted" : voteState === "voting" ? "Voting…" : "Vote"}
        </button>

        {voteMessage && (
          <p className={`text-xs mt-1.5 text-center ${
            voteState === "voted" || voteState === "duplicate" ? "text-green-600" : "text-red-500"
          }`}>
            {voteMessage}
          </p>
        )}
      </div>
    </div>
  );
}

export function VotingPage({ paramsPromise }: { paramsPromise: Promise<{ showSlug: string }> }) {
  const { showSlug } = use(paramsPromise);
  const show = KNOWN_SHOWS[showSlug];
  const seasonId = SEASON_IDS[showSlug];

  const [activeTab, setActiveTab] = useState<Tab>("vote");
  const [round, setRound] = useState<VotingRoundDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [voteStates, setVoteStates] = useState<Record<number, VoteState>>({});
  const [voteMessages, setVoteMessages] = useState<Record<number, string>>({});
  const [results, setResults] = useState<ContestantVoteDto[]>([]);
  const [votedIds, setVotedIds] = useState<Set<number>>(new Set());
  const [countdown, setCountdown] = useState<string | null>(null);

  const loadRound = useCallback(async () => {
    if (!seasonId) {
      await Promise.resolve();
      setError("Show not found.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await getActiveRound(seasonId);
      setRound(data);
      setResults(data.results);
      setCountdown(formatCountdown(data.closesAt));
    } catch {
      setError("No active voting round right now.");
    } finally {
      setLoading(false);
    }
  }, [seasonId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadRound(); }, [loadRound]);

  useEffect(() => {
    if (!round?.closesAt) return;
    const id = setInterval(() => setCountdown(formatCountdown(round.closesAt)), 60_000);
    return () => clearInterval(id);
  }, [round?.closesAt]);

  async function handleVote(contestantId: number) {
    if (!round) return;
    const voterKey = getOrCreateVoterKey();
    setVoteStates(s => ({ ...s, [contestantId]: "voting" }));
    try {
      const res = await castVote(round.id, contestantId, voterKey);
      if (res.success) {
        setVoteStates(s => ({ ...s, [contestantId]: "voted" }));
        setVotedIds(s => new Set([...s, contestantId]));
        setVoteMessages(m => ({ ...m, [contestantId]: `Voted!` }));
        const updated = await getActiveRound(seasonId);
        setResults(updated.results);
      } else if (res.message?.toLowerCase().includes("already voted")) {
        setVoteStates(s => ({ ...s, [contestantId]: "duplicate" }));
        setVoteMessages(m => ({ ...m, [contestantId]: "Already voted this round." }));
        setVotedIds(s => new Set([...s, contestantId]));
      } else {
        setVoteStates(s => ({ ...s, [contestantId]: "error" }));
        setVoteMessages(m => ({ ...m, [contestantId]: res.message ?? "Try again." }));
      }
    } catch {
      setVoteStates(s => ({ ...s, [contestantId]: "error" }));
      setVoteMessages(m => ({ ...m, [contestantId]: "Network error." }));
    }
  }

  if (!show) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-xl font-black text-gray-900 mb-3">Show not found</p>
          <Link href="/" className="text-violet-600 font-semibold hover:underline">← Back to home</Link>
        </div>
      </div>
    );
  }

  const filteredResults = results.filter(c =>
    c.contestantName.toLowerCase().includes(search.toLowerCase())
  );
  const totalVotes = results.reduce((sum, r) => sum + r.voteCount, 0);

  const tabs: { id: Tab; label: string }[] = [
    { id: "vote",       label: "Vote" },
    { id: "rankings",   label: "Rankings" },
    { id: "contestants",label: "Contestants" },
    { id: "episodes",   label: "Episodes" },
    { id: "fan-polls",  label: "Fan Polls" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Show banner */}
      <div className="relative h-52 sm:h-64 overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800">
        {/* decorative bg */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/80 to-pink-900/60" />
        <div className="absolute inset-0 flex flex-col items-start justify-end p-5 sm:p-8">
          <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">FanMeter Community</p>
          <h1 className="text-2xl sm:text-4xl font-black text-white mb-3">{show.name}</h1>

          {/* Action row */}
          <div className="flex items-center gap-2 flex-wrap">
            {round?.status === "open" && (
              <button
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-sm transition-colors"
                onClick={() => setActiveTab("vote")}
              >
                Live Fan Vote
              </button>
            )}

            {/* Week selector — display only */}
            {round && (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-white/15 backdrop-blur-sm rounded-xl text-white text-sm font-semibold">
                <span>{round.title.split("—")[0].trim()}</span>
                <span className="text-white/60">▾</span>
              </div>
            )}

            <button
              className="flex items-center gap-1.5 px-3 py-2 bg-white/15 backdrop-blur-sm rounded-xl text-white text-sm font-semibold hover:bg-white/25 transition-colors"
              aria-label="Share"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-100 sticky top-14 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center overflow-x-auto scrollbar-hide gap-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 px-4 py-4 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-red-500 text-red-500"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <TwoColumnLayout sidebar={<AdSidebar />}>
        <div className="py-5">
        {/* ── VOTE TAB ─────────────────────────────────────── */}
        {activeTab === "vote" && (
          <>
            {loading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="h-64 bg-white rounded-2xl animate-pulse border border-gray-100" />
                ))}
              </div>
            )}

            {error && !loading && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
                <p className="text-amber-800 font-semibold">{error}</p>
              </div>
            )}

            {round && !loading && (
              <>
                {/* Round info bar */}
                <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">This week&apos;s fan vote</p>
                      <p className="text-xs text-gray-400">Support your favourite contestant and see how the community is voting.</p>
                    </div>
                  </div>
                  {countdown && round.status === "open" && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-400">Voting ends in</p>
                      <p className="text-sm font-black text-red-500">{countdown}</p>
                    </div>
                  )}
                </div>

                {round.status !== "open" ? (
                  <div className="bg-gray-100 rounded-2xl p-6 text-center">
                    <p className="text-gray-700 font-semibold">Voting is currently closed.</p>
                  </div>
                ) : (
                  <>
                    {/* Search */}
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search contestants…"
                        aria-label="Search contestants"
                        className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-violet-300 bg-white"
                      />
                    </div>

                    {/* Card grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {filteredResults.map(c => (
                        <ContestantVoteCard
                          key={c.contestantId}
                          c={c}
                          totalVotes={totalVotes}
                          voteState={voteStates[c.contestantId] ?? "idle"}
                          voteMessage={voteMessages[c.contestantId]}
                          hasVoted={votedIds.has(c.contestantId)}
                          onVote={() => handleVote(c.contestantId)}
                          barColor={show.barColor}
                          btnColor={show.btnColor}
                        />
                      ))}
                      {filteredResults.length === 0 && (
                        <div className="col-span-3 text-center py-10 text-gray-400">
                          No contestants match &quot;{search}&quot;
                        </div>
                      )}
                    </div>

                    {/* Disclaimer */}
                    <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl mt-5">
                      <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-700">
                        FanMeter community poll — not an official TV vote. This is an independent fan poll
                        and is not affiliated with the Bigg Boss show or any broadcaster.
                      </p>
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* ── RANKINGS TAB ─────────────────────────────────── */}
        {activeTab === "rankings" && (
          <div className="text-center py-10">
            <p className="text-gray-500 mb-3">View full rankings</p>
            <Link
              href={`/rankings?show=${showSlug}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white font-bold rounded-xl text-sm"
            >
              Open Rankings
            </Link>
          </div>
        )}

        {/* ── CONTESTANTS TAB ──────────────────────────────── */}
        {activeTab === "contestants" && (
          <div className="text-center py-10">
            <p className="text-gray-500 mb-3">View all contestants</p>
            <Link
              href={`/shows/${showSlug}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white font-bold rounded-xl text-sm"
            >
              See Contestants
            </Link>
          </div>
        )}

        {/* ── EPISODES TAB ─────────────────────────────────── */}
        {activeTab === "episodes" && (
          <div className="text-center py-10">
            <p className="text-gray-500 mb-3">View all episodes</p>
            <Link
              href={`/shows/${showSlug}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white font-bold rounded-xl text-sm"
            >
              See Episodes
            </Link>
          </div>
        )}

        {/* ── FAN POLLS TAB ────────────────────────────────── */}
        {activeTab === "fan-polls" && (
          <div className="text-center py-10">
            <p className="text-gray-500 mb-3">Explore fan polls</p>
            <Link
              href={`/polls?show=${showSlug}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white font-bold rounded-xl text-sm"
            >
              View Fan Polls
            </Link>
          </div>
        )}
        </div>
      </TwoColumnLayout>
    </div>
  );
}
