"use client";

import React, { useEffect, useState, useCallback, useRef, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, ChevronLeft, RefreshCw } from "lucide-react";
import { getRankings, addFavourite } from "@/lib/api";
import type { ContestantRankingDto, RankingsDto } from "@/types";
import { EvictionTab } from "./EvictionTab";
import { TwoColumnLayout } from "@/components/layout/TwoColumnLayout";
import { AdSidebar } from "@/components/ads/AdSidebar";

// ── Config ────────────────────────────────────────────────────────────────────

const EVENT_CONFIG = {
  "bigg-boss-tamil-10": {
    showSlug:  "bigg-boss-tamil",
    seasonId:  6,
    name:      "Bigg Boss Tamil 10",
    shortName: "Tamil 10",
  },
  "bigg-boss-telugu-10": {
    showSlug:  "bigg-boss-telugu",
    seasonId:  7,
    name:      "Bigg Boss Telugu 10",
    shortName: "Telugu 10",
  },
  "bigg-boss-malayalam-8": {
    showSlug:  "bigg-boss-malayalam",
    seasonId:  8,
    name:      "Bigg Boss Malayalam 8",
    shortName: "Malayalam 8",
  },
  "bigg-boss-kannada-13": {
    showSlug:  "bigg-boss-kannada",
    seasonId:  9,
    name:      "Bigg Boss Kannada 13",
    shortName: "Kannada 13",
  },
} as const;

export type EventSlug = keyof typeof EVENT_CONFIG;

const VOTER_KEY_STORAGE = "fanmeter_voter_key";
const POLL_INTERVAL_MS  = 2000;

// ── CSS keyframes injected once ───────────────────────────────────────────────

const FLOAT_KEYFRAMES = `
@keyframes fm-float-up {
  0%   { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
  60%  { opacity: 0.85; }
  100% { opacity: 0; transform: translateY(-52px) scale(0.7) rotate(-8deg); }
}
@keyframes fm-ripple {
  0%   { opacity: 0.5; transform: scale(0.4); }
  100% { opacity: 0;   transform: scale(2.4); }
}
@keyframes fm-heart-pop {
  0%   { transform: scale(1); }
  35%  { transform: scale(0.82); }
  65%  { transform: scale(1.28); }
  100% { transform: scale(1); }
}
`;

// ── Voter key (anonymous, per-device) ────────────────────────────────────────

function getOrCreateVoterKey(): string {
  if (typeof window === "undefined") return "";
  let k = localStorage.getItem(VOTER_KEY_STORAGE);
  if (!k) {
    k = "fmk_" + crypto.randomUUID().replace(/-/g, "");
    localStorage.setItem(VOTER_KEY_STORAGE, k);
  }
  return k;
}

function newIdempotencyKey(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

// ── Inline SVG heart icon ─────────────────────────────────────────────────────

function HeartIcon({
  filled,
  className,
  style,
}: {
  filled:     boolean;
  className?: string;
  style?:     React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden
    >
      {filled ? (
        <path
          fill="currentColor"
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
             2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09
             C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5
             c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        />
      ) : (
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
             2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09
             C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5
             c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        />
      )}
    </svg>
  );
}

// ── RankIcon ──────────────────────────────────────────────────────────────────

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-base leading-none">🥇</span>;
  if (rank === 2) return <span className="text-base leading-none">🥈</span>;
  if (rank === 3) return <span className="text-base leading-none">🥉</span>;
  return (
    <span className="text-xs font-bold text-gray-400 tabular-nums w-5 text-center inline-block">
      {rank}
    </span>
  );
}

// ── Floating +1 animation element ────────────────────────────────────────────

interface FloatItem { id: number; x: number; y: number }

function FloatingHeart({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  return (
    <div
      onAnimationEnd={onDone}
      style={{
        position:   "fixed",
        left:       x - 18,
        top:        y - 10,
        pointerEvents: "none",
        zIndex:     9999,
        animation:  "fm-float-up 800ms ease-out forwards",
        display:    "flex",
        alignItems: "center",
        gap:        2,
        userSelect: "none",
      }}
    >
      <svg viewBox="0 0 24 24" width={14} height={14} style={{ color: "#f43f5e" }}>
        <path
          fill="currentColor"
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
             2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09
             C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5
             c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        />
      </svg>
      <span
        style={{
          fontSize:   11,
          fontWeight: 700,
          color:      "#f43f5e",
          textShadow: "0 1px 3px rgba(244,63,94,0.25)",
          lineHeight: 1,
        }}
      >
        +1
      </span>
    </div>
  );
}

// ── HeartButton ───────────────────────────────────────────────────────────────

function HeartButton({
  pending,
  count,
  onClick,
  contestantName,
}: {
  pending:        boolean;
  count:          number;
  onClick:        (rect: DOMRect) => void;
  contestantName: string;
}) {
  const [popping,  setPopping]  = useState(false);
  const [rippling, setRippling] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  function handleClick() {
    if (pending) return;
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Bounce + ripple
    setPopping(true);
    setRippling(true);
    setTimeout(() => setPopping(false),  350);
    setTimeout(() => setRippling(false), 500);

    onClick(rect);
  }

  const countLabel = count >= 1000
    ? `${(count / 1000).toFixed(1)}k`
    : String(count);

  return (
    <button
      ref={btnRef}
      onClick={handleClick}
      disabled={pending}
      aria-label={`Give one favourite to ${contestantName}`}
      className="flex flex-col items-center gap-0.5 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded-xl"
      style={{ opacity: pending ? 0.45 : 1, cursor: pending ? "wait" : "pointer" }}
    >
      {/* Circle button */}
      <div
        className="relative flex items-center justify-center w-9 h-9 rounded-full border border-rose-200 bg-white shadow-sm transition-colors duration-150 hover:bg-rose-50 hover:border-rose-300"
        style={{ overflow: "visible" }}
      >
        {/* Ripple ring */}
        {rippling && (
          <span
            className="absolute inset-0 rounded-full border-2 border-rose-400"
            style={{ animation: "fm-ripple 500ms ease-out forwards" }}
          />
        )}
        <HeartIcon
          filled={popping}
          className="w-[18px] h-[18px] text-rose-500 transition-colors duration-150"
          style={{
            animation: popping ? "fm-heart-pop 350ms ease-out forwards" : "none",
          }}
        />
      </div>

      {/* Count */}
      <span className="text-[10px] font-semibold text-gray-400 tabular-nums leading-none min-w-[28px] text-center">
        {countLabel}
      </span>
    </button>
  );
}

// ── ContestantRow ─────────────────────────────────────────────────────────────

function ContestantRow({
  c,
  pending,
  onHeart,
}: {
  c:       ContestantRankingDto;
  pending: boolean;
  onHeart: (rect: DOMRect) => void;
}) {
  const barWidth = Math.min(100, Math.max(0, c.voteShare));
  const pctLabel = c.voteShare.toFixed(1) + "%";

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 bg-white hover:border-rose-100 hover:shadow-sm transition-all duration-150">
      {/* Rank */}
      <div className="w-6 flex items-center justify-center flex-shrink-0">
        <RankIcon rank={c.rank} />
      </div>

      {/* Avatar */}
      <div className="w-10 h-10 rounded-full overflow-hidden bg-violet-100 flex-shrink-0 relative">
        {c.profileImage ? (
          <Image
            src={c.profileImage}
            alt={c.contestantName}
            fill
            className="object-cover object-top"
            sizes="40px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm font-black text-violet-400">
            {c.contestantName.charAt(0)}
          </div>
        )}
      </div>

      {/* Name + progress bar */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
          {c.contestantName}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-rose-400 transition-all duration-700"
              style={{ width: `${barWidth}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-400 tabular-nums w-9 text-right flex-shrink-0">
            {pctLabel}
          </span>
        </div>
      </div>

      {/* Heart */}
      <div className="flex-shrink-0">
        <HeartButton
          pending={pending}
          count={c.favouriteCount}
          onClick={onHeart}
          contestantName={c.contestantName}
        />
      </div>
    </div>
  );
}

// ── RankingsView ──────────────────────────────────────────────────────────────

function RankingsView({ eventSlug }: { eventSlug: EventSlug }) {
  const cfg = EVENT_CONFIG[eventSlug];

  const [data,     setData]     = useState<RankingsDto | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const [optimisticDeltas, setOptimisticDeltas] = useState<Record<number, number>>({});
  const [pendingIds,       setPendingIds]       = useState<Set<number>>(new Set());
  const [floats,           setFloats]           = useState<FloatItem[]>([]);
  const floatCounterRef = useRef(0);

  const voterKeyRef = useRef<string>("");
  useEffect(() => { voterKeyRef.current = getOrCreateVoterKey(); }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const fresh = await getRankings(cfg.seasonId, voterKeyRef.current);
      setData(fresh);
      setOptimisticDeltas({});
    } catch {
      if (!silent) setError("Could not load rankings. Check your connection.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [cfg.seasonId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const id = setInterval(() => load(true), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  async function handleHeart(c: ContestantRankingDto, rect: DOMRect) {
    if (pendingIds.has(c.contestantId)) return;

    const voterKey = voterKeyRef.current;
    const iKey     = newIdempotencyKey();

    // Floating +1 (skip if prefers-reduced-motion)
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!prefersReduced) {
      const id = ++floatCounterRef.current;
      const x  = rect.left + rect.width / 2;
      const y  = rect.top;
      setFloats(prev => [...prev, { id, x, y }]);
    }

    // Optimistic +1
    setOptimisticDeltas(prev => ({
      ...prev,
      [c.contestantId]: (prev[c.contestantId] ?? 0) + 1,
    }));
    setPendingIds(s => new Set([...s, c.contestantId]));

    try {
      const res = await addFavourite(cfg.seasonId, c.contestantId, voterKey, iKey);
      if (res.success && !res.duplicate) {
        setOptimisticDeltas(prev => {
          const next = { ...prev };
          const rem  = (next[c.contestantId] ?? 0) - 1;
          if (rem <= 0) delete next[c.contestantId];
          else          next[c.contestantId] = rem;
          return next;
        });
        load(true);
      } else if (!res.success) {
        // Rollback
        setOptimisticDeltas(prev => {
          const next = { ...prev };
          const rem  = (next[c.contestantId] ?? 0) - 1;
          if (rem <= 0) delete next[c.contestantId];
          else          next[c.contestantId] = rem;
          return next;
        });
      }
    } catch {
      setOptimisticDeltas(prev => {
        const next = { ...prev };
        const rem  = (next[c.contestantId] ?? 0) - 1;
        if (rem <= 0) delete next[c.contestantId];
        else          next[c.contestantId] = rem;
        return next;
      });
    } finally {
      setPendingIds(s => { const n = new Set(s); n.delete(c.contestantId); return n; });
    }
  }

  if (loading) {
    return (
      <div className="space-y-2 pt-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-14 bg-white rounded-xl animate-pulse border border-gray-100" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
        <p className="text-amber-800 font-semibold mb-3">{error ?? "No data available."}</p>
        <button onClick={() => load()} className="text-sm text-violet-600 hover:underline font-semibold">
          Try again
        </button>
      </div>
    );
  }

  // Defensive: filter eliminated, apply optimistic deltas, recompute voteShare, re-rank
  const withDeltas = data.rankings
    .filter(c => c.status?.toLowerCase() !== "eliminated")
    .map(c => ({
      ...c,
      favouriteCount: c.favouriteCount + (optimisticDeltas[c.contestantId] ?? 0),
    }));

  const totalFavourites = withDeltas.reduce((s, c) => s + c.favouriteCount, 0);

  const displayList = withDeltas
    .map(c => ({
      ...c,
      voteShare: totalFavourites > 0 ? (c.favouriteCount / totalFavourites) * 100 : 0,
    }))
    .sort((a, b) => b.favouriteCount - a.favouriteCount
      || a.contestantName.localeCompare(b.contestantName))
    .map((c, i) => ({ ...c, rank: i + 1 }));

  const updatedAt = new Date(data.updatedAt).toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  return (
    <>
      {/* Inject keyframes once */}
      <style>{FLOAT_KEYFRAMES}</style>

      {/* Floating +1 reactions (fixed, above everything) */}
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
          {totalFavourites > 0
            ? `${totalFavourites.toLocaleString()} total favourites`
            : "Be the first to favourite a contestant"}
        </p>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <RefreshCw className="w-3 h-3" />
          <span>{updatedAt}</span>
        </div>
      </div>

      {/* Rankings list */}
      <div className="space-y-2">
        {displayList.map(c => (
          <ContestantRow
            key={c.contestantId}
            c={c}
            pending={pendingIds.has(c.contestantId)}
            onHeart={(rect) => handleHeart(c, rect)}
          />
        ))}
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl mt-6 mb-2">
        <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          <strong>FanMeter is an independent fan community platform.</strong> Favourites here do not affect
          official Bigg Boss evictions. Official voting: Star Vijay / JioHotstar (Tamil) · Star Maa / JioHotstar (Telugu) · Asianet / JioHotstar (Malayalam) · Colors Kannada / JioHotstar (Kannada).
        </p>
      </div>

      <p className="text-[10px] text-gray-300 text-center pb-4">
        Each click is a new favourite. Idempotency keys prevent duplicate submissions from retries.
      </p>
    </>
  );
}

// ── EventPage (main export) ───────────────────────────────────────────────────

type Tab = "rankings" | "eviction";

function EventPageInner({ eventSlug }: { eventSlug: EventSlug }) {
  const cfg = EVENT_CONFIG[eventSlug];
  const [activeTab, setActiveTab] = useState<Tab>("rankings");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky sub-header — spans full max-w-5xl to align with two-column content */}
      <div className="bg-white border-b border-gray-100 sticky top-14 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 h-12">
            <Link
              href="/"
              className="flex items-center gap-1 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0 text-sm font-medium"
              aria-label="Back to events"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Events</span>
            </Link>
            <span className="text-gray-200 select-none flex-shrink-0">|</span>
            <span className="text-sm font-bold text-gray-800 truncate flex-1 min-w-0">{cfg.name}</span>
          </div>
          {/* Tab bar */}
          <div className="flex gap-0 -mb-px">
            <button
              onClick={() => setActiveTab("rankings")}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === "rankings"
                  ? "border-rose-500 text-rose-600"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              ❤️ Fan Rankings
            </button>
            <button
              onClick={() => setActiveTab("eviction")}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === "eviction"
                  ? "border-rose-500 text-rose-600"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              🔴 This Week&apos;s Eviction
            </button>
          </div>
        </div>
      </div>

      {/* Two-column: rankings/eviction left, ad sidebar right */}
      <div className="pb-20 md:pb-10">
        <TwoColumnLayout sidebar={<AdSidebar />}>
          {activeTab === "rankings" && <RankingsView eventSlug={eventSlug} />}
          {activeTab === "eviction" && (
            <EvictionTab
              seasonId={cfg.seasonId}
              showSlug={cfg.showSlug}
            />
          )}
        </TwoColumnLayout>
      </div>
    </div>
  );
}

export function EventPage({ eventSlug }: { eventSlug: EventSlug }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <EventPageInner eventSlug={eventSlug} />
    </Suspense>
  );
}
