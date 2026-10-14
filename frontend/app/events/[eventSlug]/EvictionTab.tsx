"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp, Shield, Clock, ExternalLink } from "lucide-react";
import { getActiveEvictionPoll, getEvictionHistory, getRankings, addFavourite } from "@/lib/api";
import type { EvictionPollDto, EvictionNomineeDto, NominationState } from "@/types";
import {
  FLOAT_KEYFRAMES,
  FloatingHeart,
  HeartButton,
  FloatItem,
  newIdempotencyKey,
  getOrCreateVoterKey,
} from "@/components/events/HeartVoting";

const POLL_INTERVAL_MS = 30_000;

// ── PastPollRow ───────────────────────────────────────────────────────────────

function PastPollRow({ poll }: { poll: EvictionPollDto }) {
  const [open, setOpen] = useState(false);
  const winner = poll.nominees[0];

  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <div>
          <span className="text-sm font-semibold text-gray-800">
            {poll.weekLabel ?? `Week ${poll.weekNumber}`}
          </span>
          {winner && (
            <span className="text-xs text-gray-400 ml-2">
              · Most saves: {winner.contestantName}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 pb-3 bg-gray-50 space-y-1.5 pt-1">
          {poll.nominees.map(n => (
            <div key={n.contestantId} className="flex items-center gap-2 text-sm">
              <span className="text-gray-400 tabular-nums w-4 text-right">{n.rank}.</span>
              <span className="text-gray-800 font-medium">{n.contestantName}</span>
              <span className="ml-auto text-xs text-gray-400">{n.voteCount.toLocaleString()} saves</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── NomineeHeartRow ───────────────────────────────────────────────────────────

function NomineeHeartRow({
  nominee,
  favouriteCount,
  voteShare,
  pending,
  onHeart,
}: {
  nominee:        EvictionNomineeDto;
  favouriteCount: number;
  voteShare:      number;
  pending:        boolean;
  onHeart:        (rect: DOMRect) => void;
}) {
  const barWidth = Math.min(100, Math.max(0, voteShare));

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 bg-white hover:border-rose-100 hover:shadow-sm transition-all duration-150">
      {/* Rank */}
      <span className="text-xs font-bold text-gray-400 tabular-nums w-5 text-center flex-shrink-0">
        {nominee.rank}
      </span>

      {/* Avatar */}
      <div className="w-10 h-10 rounded-full overflow-hidden bg-violet-100 flex-shrink-0 relative">
        {nominee.profileImage ? (
          <Image
            src={nominee.profileImage}
            alt={nominee.contestantName}
            fill
            className="object-cover object-top"
            sizes="40px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm font-black text-violet-400">
            {nominee.contestantName.charAt(0)}
          </div>
        )}
      </div>

      {/* Name + progress bar */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
          {nominee.contestantName}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-rose-400 transition-all duration-700"
              style={{ width: `${barWidth}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-400 tabular-nums w-9 text-right flex-shrink-0">
            {voteShare.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Heart */}
      <div className="flex-shrink-0">
        <HeartButton
          pending={pending}
          count={favouriteCount}
          onClick={onHeart}
          contestantName={nominee.contestantName}
        />
      </div>
    </div>
  );
}

// ── State banners ─────────────────────────────────────────────────────────────

function NominationStateBanner({
  state,
  sourceAttribution,
}: {
  state: NominationState | null;
  sourceAttribution: string | null;
}) {
  if (!state || state === "NOMINATIONS_PUBLISHED" || state === "POLL_OPEN") return null;

  if (state === "NEEDS_VERIFICATION") {
    return (
      <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-3">
        <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 leading-relaxed">
          <strong>Nominees pending verification.</strong>{" "}
          Names were discovered automatically but couldn&apos;t be confirmed against the cast list.
          Check back soon or{" "}
          {sourceAttribution
            ? <a href={sourceAttribution} target="_blank" rel="noopener noreferrer" className="underline font-semibold inline-flex items-center gap-0.5">view source <ExternalLink className="w-3 h-3" /></a>
            : "check the official source"
          }.
        </div>
      </div>
    );
  }

  if (state === "SOURCE_UNAVAILABLE") {
    return (
      <div className="flex items-start gap-2.5 p-3 bg-gray-50 border border-gray-200 rounded-xl mb-3">
        <AlertCircle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-600 leading-relaxed">
          <strong>Nomination data temporarily unavailable.</strong>{" "}
          We&apos;re unable to reach the nominations source right now. The poll will update automatically.
        </p>
      </div>
    );
  }

  return null;
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyPollState({
  state,
  sourceAttribution,
}: {
  state: NominationState | null;
  sourceAttribution: string | null;
}) {
  if (state === "SOURCE_UNAVAILABLE") {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
        <AlertCircle className="w-10 h-10 text-gray-300" />
        <p className="text-gray-500 font-semibold">Nomination data temporarily unavailable</p>
        <p className="text-sm text-gray-400 max-w-xs">
          We&apos;re unable to fetch nominations right now. The poll will update automatically once the source is reachable.
        </p>
      </div>
    );
  }

  if (state === "NEEDS_VERIFICATION") {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
        <Clock className="w-10 h-10 text-amber-300" />
        <p className="text-gray-500 font-semibold">Nominees being verified</p>
        <p className="text-sm text-gray-400 max-w-xs">
          Nominations were discovered but are awaiting verification. Check back shortly.
        </p>
        {sourceAttribution && (
          <a href={sourceAttribution} target="_blank" rel="noopener noreferrer"
            className="text-xs text-violet-600 font-semibold hover:underline inline-flex items-center gap-1 mt-1">
            View on HousePulse <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    );
  }

  if (state === "NO_NOMINATIONS_CONFIRMED") {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
        <Shield className="w-10 h-10 text-gray-300" />
        <p className="text-gray-500 font-semibold">No eviction this week</p>
        <p className="text-sm text-gray-400 max-w-xs">
          HousePulse confirms no nominations have been announced yet for this week.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <Shield className="w-10 h-10 text-gray-300" />
      <p className="text-gray-500 font-semibold">No active eviction poll this week</p>
      <p className="text-sm text-gray-400 max-w-xs">
        Nominations are discovered automatically each week. Check back soon.
      </p>
    </div>
  );
}

// ── Main EvictionTab ──────────────────────────────────────────────────────────

export function EvictionTab({
  seasonId,
  showSlug,
}: {
  seasonId: number;
  showSlug: string;
}) {
  const voterKeyRef = useRef<string>("");
  useEffect(() => { voterKeyRef.current = getOrCreateVoterKey(); }, []);

  const [poll,       setPoll]       = useState<EvictionPollDto | null | undefined>(undefined);
  const [history,    setHistory]    = useState<EvictionPollDto[]>([]);
  const [error,      setError]      = useState<string | null>(null);
  const [updatedAt,  setUpdatedAt]  = useState<string>("");

  // Heart voting state
  const [favouriteCounts,  setFavouriteCounts]  = useState<Record<number, number>>({});
  const [optimisticDeltas, setOptimisticDeltas] = useState<Record<number, number>>({});
  const [pendingIds,       setPendingIds]       = useState<Set<number>>(new Set());
  const [floats,           setFloats]           = useState<FloatItem[]>([]);
  const floatCounterRef = useRef(0);

  const load = useCallback(async (silent = false) => {
    setError(null);
    try {
      const [p, h] = await Promise.all([
        getActiveEvictionPoll(seasonId),
        getEvictionHistory(seasonId),
      ]);
      setPoll(p);
      setHistory(h);
      setUpdatedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch {
      if (!silent) setError("Could not load eviction poll. Check your connection.");
    }
  }, [seasonId]);

  const loadFavourites = useCallback(async () => {
    try {
      const data = await getRankings(seasonId, voterKeyRef.current);
      const map: Record<number, number> = {};
      data.rankings.forEach(r => { map[r.contestantId] = r.favouriteCount; });
      setFavouriteCounts(map);
      setOptimisticDeltas({});
    } catch {
      // Non-fatal — counts will show 0 until resolved
    }
  }, [seasonId]);

  useEffect(() => {
    load();
    loadFavourites();
  }, [load, loadFavourites]);

  useEffect(() => {
    const id = setInterval(() => load(true), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  async function handleHeart(nominee: EvictionNomineeDto, rect: DOMRect) {
    if (pendingIds.has(nominee.contestantId)) return;

    const voterKey = voterKeyRef.current;
    const iKey     = newIdempotencyKey();

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!prefersReduced) {
      const id = ++floatCounterRef.current;
      const x  = rect.left + rect.width / 2;
      const y  = rect.top;
      setFloats(prev => [...prev, { id, x, y }]);
    }

    setOptimisticDeltas(prev => ({
      ...prev,
      [nominee.contestantId]: (prev[nominee.contestantId] ?? 0) + 1,
    }));
    setPendingIds(s => new Set([...s, nominee.contestantId]));

    try {
      const res = await addFavourite(seasonId, nominee.contestantId, voterKey, iKey);
      if (res.success && !res.duplicate) {
        setOptimisticDeltas(prev => {
          const next = { ...prev };
          const rem  = (next[nominee.contestantId] ?? 0) - 1;
          if (rem <= 0) delete next[nominee.contestantId];
          else          next[nominee.contestantId] = rem;
          return next;
        });
        loadFavourites();
      } else if (!res.success) {
        setOptimisticDeltas(prev => {
          const next = { ...prev };
          const rem  = (next[nominee.contestantId] ?? 0) - 1;
          if (rem <= 0) delete next[nominee.contestantId];
          else          next[nominee.contestantId] = rem;
          return next;
        });
      }
    } catch {
      setOptimisticDeltas(prev => {
        const next = { ...prev };
        const rem  = (next[nominee.contestantId] ?? 0) - 1;
        if (rem <= 0) delete next[nominee.contestantId];
        else          next[nominee.contestantId] = rem;
        return next;
      });
    } finally {
      setPendingIds(s => { const n = new Set(s); n.delete(nominee.contestantId); return n; });
    }
  }

  // Loading state
  if (poll === undefined) {
    return (
      <div className="space-y-2 pt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 bg-white rounded-xl animate-pulse border border-gray-100" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
        <p className="text-amber-800 font-semibold mb-3">{error}</p>
        <button onClick={() => load()} className="text-sm text-violet-600 hover:underline font-semibold">
          Try again
        </button>
      </div>
    );
  }

  const nominationState   = poll?.nominationState ?? null;
  const sourceAttribution = poll?.sourceAttribution ?? null;
  const hasVotableNominees = poll?.nominees && poll.nominees.length > 0 && poll.status === "open";
  const showEmpty = !poll || (!hasVotableNominees && nominationState !== "NOMINATIONS_PUBLISHED");

  // Compute per-nominee favourite counts (with optimistic deltas) and vote share
  const nomineeDisplayData = poll?.nominees.map(n => {
    const count = (favouriteCounts[n.contestantId] ?? 0) + (optimisticDeltas[n.contestantId] ?? 0);
    return { nominee: n, count };
  }) ?? [];

  const totalNomineeHearts = nomineeDisplayData.reduce((s, { count }) => s + count, 0);
  const nomineeRows = nomineeDisplayData.map(({ nominee, count }) => ({
    nominee,
    favouriteCount: count,
    voteShare: totalNomineeHearts > 0 ? (count / totalNomineeHearts) * 100 : 0,
  }));

  const officialVotingLinks: Record<string, string> = {
    "bigg-boss-tamil":     "Star Vijay / JioHotstar",
    "bigg-boss-telugu":    "Star Maa / JioHotstar",
    "bigg-boss-malayalam": "Asianet / JioHotstar",
    "bigg-boss-kannada":   "Colors Kannada / JioHotstar",
  };
  const officialLink = officialVotingLinks[showSlug] ?? "the official broadcaster";

  return (
    <>
      <style>{FLOAT_KEYFRAMES}</style>

      {floats.map(f => (
        <FloatingHeart
          key={f.id}
          x={f.x}
          y={f.y}
          onDone={() => setFloats(prev => prev.filter(i => i.id !== f.id))}
        />
      ))}

      {/* Meta bar */}
      <div className="flex items-center justify-between mt-4 mb-3 gap-2">
        <p className="text-xs text-gray-400">
          {poll
            ? `${poll.weekLabel ?? `Week ${poll.weekNumber}`} · Vote to SAVE your favourite`
            : "No active eviction poll"}
        </p>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <RefreshCw className="w-3 h-3" />
          <span>{updatedAt}</span>
        </div>
      </div>

      {/* State banner */}
      {poll && <NominationStateBanner state={nominationState} sourceAttribution={sourceAttribution} />}

      {/* Empty / pending state */}
      {showEmpty && (
        <EmptyPollState state={nominationState} sourceAttribution={sourceAttribution} />
      )}

      {/* Nominee list with hearts */}
      {!showEmpty && poll && (
        <div className="space-y-2">
          {nomineeRows.map(({ nominee, favouriteCount, voteShare }) => (
            <NomineeHeartRow
              key={nominee.contestantId}
              nominee={nominee}
              favouriteCount={favouriteCount}
              voteShare={voteShare}
              pending={pendingIds.has(nominee.contestantId)}
              onHeart={(rect) => handleHeart(nominee, rect)}
            />
          ))}
        </div>
      )}

      {/* Past polls */}
      {history.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Previous weeks</p>
          <div className="space-y-2">
            {history.map(h => (
              <PastPollRow key={h.id} poll={h} />
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl mt-6 mb-2">
        <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          <strong>Independent fan poll.</strong> This does not affect official Bigg Boss evictions.
          For official voting, use {officialLink}.
        </p>
      </div>
    </>
  );
}
