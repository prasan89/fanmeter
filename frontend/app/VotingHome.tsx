"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Clock, AlertCircle, Search, BarChart3 } from "lucide-react";
import { getActiveRound, castVote } from "@/lib/api";
import type { VotingRoundDto, ContestantVoteDto } from "@/types";

const SHOWS = [
  {
    slug: "bigg-boss-tamil",
    name: "Bigg Boss Tamil 10",
    shortName: "Tamil 10",
    seasonId: 6,
    accentColor: "text-rose-500",
    barColor: "bg-rose-500",
    btnColor: "bg-rose-500 hover:bg-rose-600",
    tabActive: "border-rose-500 text-rose-500",
    selectorActive: "bg-rose-500 text-white",
    selectorInactive: "text-gray-600 hover:text-gray-900",
  },
  {
    slug: "bigg-boss-telugu",
    name: "Bigg Boss Telugu 10",
    shortName: "Telugu 10",
    seasonId: 7,
    accentColor: "text-blue-600",
    barColor: "bg-blue-500",
    btnColor: "bg-blue-600 hover:bg-blue-700",
    tabActive: "border-blue-500 text-blue-600",
    selectorActive: "bg-blue-600 text-white",
    selectorInactive: "text-gray-600 hover:text-gray-900",
  },
] as const;

type ShowSlug = (typeof SHOWS)[number]["slug"];

function formatCountdown(closesAt: string | null): string | null {
  if (!closesAt) return null;
  const diffMs = new Date(closesAt).getTime() - Date.now();
  if (diffMs <= 0) return "Closed";
  const days = Math.floor(diffMs / 86400000);
  const hrs  = Math.floor((diffMs % 86400000) / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  if (days > 0) return `${days}d ${hrs}h ${mins}m`;
  if (hrs  > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

function getOrCreateVoterKey(): string {
  const KEY = "fanmeter_voter_key";
  let stored = localStorage.getItem(KEY);
  if (!stored) {
    stored = "fmk_" + crypto.randomUUID().replace(/-/g, "");
    localStorage.setItem(KEY, stored);
  }
  return stored;
}

type VoteState = "idle" | "voting" | "voted" | "error" | "duplicate";

function ContestantCard({
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
        <div className="absolute top-2 left-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow-sm">
          <span className="text-xs font-black text-gray-700">#{c.rank}</span>
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-center justify-between mb-1">
          <p className="font-bold text-gray-900 text-sm truncate">{c.contestantName}</p>
          <span className="text-sm font-black text-gray-900 flex-shrink-0 ml-1">{pct}%</span>
        </div>

        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full ${barColor} transition-all duration-700`}
            style={{ width: `${barWidth}%` }}
          />
        </div>

        <button
          onClick={onVote}
          disabled={hasVoted || voteState === "voting"}
          aria-label={hasVoted ? `Supported ${c.contestantName}` : `Support ${c.contestantName}`}
          className={`w-full py-2 rounded-xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
            hasVoted
              ? "bg-green-100 text-green-700 cursor-default"
              : voteState === "voting"
              ? "bg-gray-100 text-gray-400 cursor-wait"
              : `${btnColor} text-white shadow-sm hover:shadow`
          }`}
        >
          {hasVoted ? "✓ Supported" : voteState === "voting" ? "Supporting…" : "Support"}
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

function ShowVoting({ showSlug }: { showSlug: ShowSlug }) {
  const show = SHOWS.find((s) => s.slug === showSlug)!;

  const [round, setRound]           = useState<VotingRoundDto | null>(null);
  const [results, setResults]       = useState<ContestantVoteDto[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState("");
  const [countdown, setCountdown]   = useState<string | null>(null);
  const [voteStates, setVoteStates] = useState<Record<number, VoteState>>({});
  const [voteMessages, setVoteMessages] = useState<Record<number, string>>({});
  const [votedIds, setVotedIds]     = useState<Set<number>>(new Set());

  const loadRound = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getActiveRound(show.seasonId);
      setRound(data);
      setResults(data.results);
      setCountdown(formatCountdown(data.closesAt));
    } catch {
      setError("No active voting round right now. Check back soon.");
    } finally {
      setLoading(false);
    }
  }, [show.seasonId]);

  useEffect(() => { loadRound(); }, [loadRound]);

  useEffect(() => {
    if (!round?.closesAt) return;
    const id = setInterval(() => setCountdown(formatCountdown(round.closesAt)), 60_000);
    return () => clearInterval(id);
  }, [round?.closesAt]);

  async function handleVote(contestantId: number) {
    if (!round) return;
    const voterKey = getOrCreateVoterKey();
    setVoteStates((s) => ({ ...s, [contestantId]: "voting" }));
    try {
      const res = await castVote(round.id, contestantId, voterKey);
      if (res.success) {
        setVoteStates((s) => ({ ...s, [contestantId]: "voted" }));
        setVotedIds((s) => new Set([...s, contestantId]));
        setVoteMessages((m) => ({ ...m, [contestantId]: "Your support has been counted!" }));
        const updated = await getActiveRound(show.seasonId);
        setResults(updated.results);
      } else if (res.message?.toLowerCase().includes("already voted")) {
        setVoteStates((s) => ({ ...s, [contestantId]: "duplicate" }));
        setVoteMessages((m) => ({ ...m, [contestantId]: "Already supported this round." }));
        setVotedIds((s) => new Set([...s, contestantId]));
      } else {
        setVoteStates((s) => ({ ...s, [contestantId]: "error" }));
        setVoteMessages((m) => ({ ...m, [contestantId]: res.message ?? "Try again." }));
      }
    } catch {
      setVoteStates((s) => ({ ...s, [contestantId]: "error" }));
      setVoteMessages((m) => ({ ...m, [contestantId]: "Network error." }));
    }
  }

  const filtered = results.filter((c) =>
    c.contestantName.toLowerCase().includes(search.toLowerCase())
  );
  const totalVotes = results.reduce((sum, r) => sum + r.voteCount, 0);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-64 bg-white rounded-2xl animate-pulse border border-gray-100" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
        <p className="text-amber-800 font-semibold">{error}</p>
        <Link href="/rankings" className="mt-3 inline-block text-sm text-violet-600 hover:underline">
          View current rankings →
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Round info bar */}
      {round && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 mt-5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{round.title}</p>
              <p className="text-xs text-gray-400">
                {totalVotes > 0
                  ? `${totalVotes.toLocaleString()} fans showing support`
                  : "Support your favourite contestant"}
              </p>
            </div>
          </div>
          {countdown && round.status === "open" && (
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-gray-400">Voting ends in</p>
              <p className="text-sm font-black text-red-500">{countdown}</p>
            </div>
          )}
        </div>
      )}

      {round?.status !== "open" ? (
        <div className="mt-5 bg-gray-100 rounded-2xl p-8 text-center">
          <p className="text-gray-700 font-semibold mb-2">Voting is currently closed.</p>
          <Link href="/rankings" className="text-sm text-violet-600 hover:underline">
            See current rankings →
          </Link>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="relative mt-5 mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${show.shortName} contestants…`}
              aria-label="Search contestants"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-violet-300 bg-white"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((c) => (
              <ContestantCard
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
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-10 text-gray-400">
                No contestants match &quot;{search}&quot;
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

function VotingHomeInner() {
  const searchParams = useSearchParams();
  const showParam = searchParams.get("show");
  const initialSlug: ShowSlug =
    showParam === "bigg-boss-telugu" ? "bigg-boss-telugu" : "bigg-boss-tamil";

  const [activeShow, setActiveShow] = useState<ShowSlug>(initialSlug);
  const show = SHOWS.find((s) => s.slug === activeShow)!;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-black text-gray-900">Fan Support</h1>
              <p className="text-sm text-gray-400 mt-0.5">Community poll — not an official broadcaster vote</p>
            </div>
            <Link
              href="/rankings"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-50 border border-gray-200 text-gray-600 font-semibold rounded-xl text-sm hover:border-violet-300 hover:text-violet-600 transition-all"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Rankings
            </Link>
          </div>

          {/* Show selector */}
          <div className="flex items-center gap-1 mt-4 bg-gray-100 rounded-xl p-1 w-fit">
            {SHOWS.map((s) => (
              <button
                key={s.slug}
                onClick={() => setActiveShow(s.slug)}
                className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${
                  activeShow === s.slug
                    ? s.selectorActive + " shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {s.shortName}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-10">
        <ShowVoting key={activeShow} showSlug={activeShow} />

        {/* Disclaimer */}
        <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl mt-6">
          <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            <strong>FanMeter is an independent fan community platform.</strong> Votes here do not affect official
            Bigg Boss evictions. Official voting: Star Vijay / JioHotstar (Tamil) · Star Maa / JioHotstar (Telugu).
          </p>
        </div>
      </div>
    </div>
  );
}

export function VotingHome() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <VotingHomeInner />
    </Suspense>
  );
}
