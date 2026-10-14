"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { AlertCircle, RefreshCw, TrendingUp } from "lucide-react";

// ── Types (mirrors SentimentSummaryDto) ───────────────────────────────────────

interface SourceObservation {
  sourceKey: string;
  sourceDisplayName: string;
  pollUrl: string | null;
  rawCount: number;
  sharePct: number | null;
  rankPosition: number;
}

interface ContestantSentiment {
  contestantId: number;
  contestantName: string;
  contestantSlug: string;
  profileImage: string | null;
  fanmeterVotes: number;
  fanmeterSharePct: number;
  externalScore: number | null;
  combinedScore: number | null;
  rank: number;
  sourceData: SourceObservation[];
}

interface SentimentSummary {
  showSlug: string;
  periodLabel: string | null;
  sourcesUsed: number;
  computedAt: string | null;
  contestants: ContestantSentiment[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function fetchSentiment(eventSlug: string): Promise<SentimentSummary | null> {
  const res = await fetch(`${API_BASE}/api/events/${eventSlug}/sentiment`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) return null;
  return res.json();
}

// ── ScoreBar ──────────────────────────────────────────────────────────────────

function ScoreBar({
  value,
  label,
  color = "bg-violet-500",
}: {
  value: number;
  label: string;
  color?: string;
}) {
  const width = Math.min(100, Math.max(0, value));
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-400 w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="text-[10px] text-gray-500 tabular-nums w-8 text-right flex-shrink-0">
        {value.toFixed(1)}
      </span>
    </div>
  );
}

// ── SentimentRow ──────────────────────────────────────────────────────────────

function SentimentRow({ c }: { c: ContestantSentiment }) {
  const combined = c.combinedScore ?? c.externalScore ?? 0;
  const fanShare = c.fanmeterSharePct ?? 0;
  const isTop = c.rank === 1;

  return (
    <div
      className={`flex items-start gap-3 px-3 py-3 rounded-xl border transition-all duration-150 ${
        isTop
          ? "bg-violet-50 border-violet-100 hover:border-violet-200"
          : "bg-white border-gray-100 hover:border-violet-100 hover:shadow-sm"
      }`}
    >
      {/* Rank */}
      <div className="w-6 flex items-center justify-center flex-shrink-0 mt-1">
        {c.rank <= 3 ? (
          <span className="text-base leading-none">
            {c.rank === 1 ? "🥇" : c.rank === 2 ? "🥈" : "🥉"}
          </span>
        ) : (
          <span className="text-xs font-bold text-gray-400 tabular-nums">{c.rank}</span>
        )}
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

      {/* Name + score bars */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate leading-tight mb-1.5">
          {c.contestantName}
        </p>
        <div className="space-y-1">
          <ScoreBar value={combined} label="Combined" color="bg-violet-500" />
          {c.externalScore != null && (
            <ScoreBar value={c.externalScore} label="External" color="bg-blue-400" />
          )}
          <ScoreBar value={fanShare} label="FanMeter" color="bg-rose-400" />
        </div>
      </div>

      {/* Combined score badge */}
      <div className="flex-shrink-0 text-right mt-0.5">
        <span className="text-sm font-black text-violet-700 tabular-nums">
          {combined.toFixed(1)}
        </span>
        <p className="text-[9px] text-gray-400">score</p>
      </div>
    </div>
  );
}

// ── SentimentTab (main export) ────────────────────────────────────────────────

export function SentimentTab({ eventSlug }: { eventSlug: string }) {
  const [data,    setData]    = useState<SentimentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const result = await fetchSentiment(eventSlug);
      setData(result);
    } catch {
      if (!silent) setError("Could not load sentiment data.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => { load(); }, [eventSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="space-y-2 pt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 bg-white rounded-xl animate-pulse border border-gray-100" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
        <p className="text-amber-800 font-semibold mb-3">{error ?? "Sentiment data not yet available."}</p>
        <button onClick={() => load()} className="text-sm text-violet-600 hover:underline font-semibold">
          Try again
        </button>
      </div>
    );
  }

  if (!data.contestants.length) {
    return (
      <div className="mt-6 text-center py-12 text-gray-400">
        <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="font-semibold">No sentiment data yet for this show.</p>
        <p className="text-sm mt-1">Check back once nominations are published.</p>
      </div>
    );
  }

  const computedAt = data.computedAt
    ? new Date(data.computedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <>
      {/* Section heading */}
      <div className="mt-4 mb-3">
        <h2 className="text-lg font-black text-gray-900">Fan Sentiment</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {data.periodLabel ?? "Latest period"} · Combined external + FanMeter signal
        </p>
      </div>

      <div className="flex items-center justify-between mb-3 gap-2">
        <p className="text-xs text-gray-400">
          {data.sourcesUsed} source{data.sourcesUsed !== 1 ? "s" : ""} · {data.contestants.length} contestants
        </p>
        {computedAt && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <RefreshCw className="w-3 h-3" />
            <span>{computedAt}</span>
          </div>
        )}
      </div>

      {/* Score guide */}
      <div className="flex gap-4 mb-4 text-[10px] text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500 inline-block" /> Combined (0-100)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> External polls</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block" /> FanMeter ❤</span>
      </div>

      <div className="space-y-2">
        {data.contestants.map(c => (
          <SentimentRow key={c.contestantId} c={c} />
        ))}
      </div>

      {/* Methodology note */}
      <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl mt-6 mb-2">
        <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          <strong>About Fan Sentiment:</strong> The combined score blends publicly available external poll signals
          (e.g. HousePulse nominations) with FanMeter heart-click votes. External data is sourced separately
          and never added to FanMeter vote totals. This is an independent fan community metric — not an official
          broadcaster vote.
        </p>
      </div>
    </>
  );
}
