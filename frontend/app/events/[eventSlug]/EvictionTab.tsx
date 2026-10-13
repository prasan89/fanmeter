"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp, Shield } from "lucide-react";
import { getActiveEvictionPoll, castEvictionVote, getEvictionHistory } from "@/lib/api";
import type { EvictionPollDto, EvictionNomineeDto } from "@/types";

const POLL_INTERVAL_MS   = 30_000;
const VOTED_KEY          = "fanmeter_eviction_votes"; // localStorage: { pollId: contestantId }
const VOTER_KEY_STORAGE  = "fanmeter_voter_key";

function getOrCreateVoterKey(): string {
  if (typeof window === "undefined") return "";
  let k = localStorage.getItem(VOTER_KEY_STORAGE);
  if (!k) {
    k = "fmk_" + crypto.randomUUID().replace(/-/g, "");
    localStorage.setItem(VOTER_KEY_STORAGE, k);
  }
  return k;
}

function getVotedMap(): Record<number, number> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(VOTED_KEY) ?? "{}") as Record<number, number>; }
  catch { return {}; }
}
function saveVote(pollId: number, contestantId: number) {
  const m = getVotedMap();
  m[pollId] = contestantId;
  localStorage.setItem(VOTED_KEY, JSON.stringify(m));
}

// ── Countdown ─────────────────────────────────────────────────────────────────

function Countdown({ closesAt }: { closesAt: string | null }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!closesAt) return;
    const tick = () => {
      const diff = new Date(closesAt).getTime() - Date.now();
      if (diff <= 0) { setLabel("Closed"); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setLabel(`${h}h ${m}m ${s}s remaining`);
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [closesAt]);

  if (!closesAt || !label) return null;
  return (
    <span className="text-xs text-amber-600 font-semibold tabular-nums">{label}</span>
  );
}

// ── NomineeCard ───────────────────────────────────────────────────────────────

function NomineeCard({
  nominee,
  voted,
  pending,
  onVote,
}: {
  nominee:  EvictionNomineeDto;
  voted:    boolean;
  pending:  boolean;
  onVote:   () => void;
}) {
  const barWidth = Math.min(100, Math.max(0, nominee.voteShare));

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-150 ${
      voted
        ? "border-emerald-200 bg-emerald-50"
        : "border-gray-100 bg-white hover:border-rose-100 hover:shadow-sm"
    }`}>
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

      {/* Name + bar */}
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
            {nominee.voteCount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={onVote}
        disabled={pending || voted}
        aria-label={voted ? `Voted to save ${nominee.contestantName}` : `Save ${nominee.contestantName}`}
        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
          voted
            ? "bg-emerald-500 text-white cursor-default"
            : pending
            ? "bg-gray-200 text-gray-400 cursor-wait"
            : "bg-rose-500 hover:bg-rose-600 active:scale-95 text-white"
        }`}
      >
        {voted ? "Saved ✓" : "❤️ Save"}
      </button>
    </div>
  );
}

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
  const [pendingId,  setPendingId]  = useState<number | null>(null);
  const [votedMap,   setVotedMap]   = useState<Record<number, number>>({});
  const [error,      setError]      = useState<string | null>(null);
  const [updatedAt,  setUpdatedAt]  = useState<string>("");

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

  useEffect(() => {
    setVotedMap(getVotedMap());
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => load(true), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  async function handleVote(nominee: EvictionNomineeDto) {
    if (!poll || pendingId !== null) return;
    if (votedMap[poll.id] !== undefined) return;

    setPendingId(nominee.contestantId);
    try {
      const res = await castEvictionVote(seasonId, poll.id, nominee.contestantId, voterKeyRef.current);
      if (res.success) {
        saveVote(poll.id, nominee.contestantId);
        setVotedMap(getVotedMap());
        load(true);
      }
    } finally {
      setPendingId(null);
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

  const votedContestantId = poll ? votedMap[poll.id] : undefined;

  const officialVotingLinks: Record<string, string> = {
    "bigg-boss-tamil":    "Star Vijay / JioHotstar",
    "bigg-boss-telugu":   "Star Maa / JioHotstar",
    "bigg-boss-malayalam": "Asianet / JioHotstar",
    "bigg-boss-kannada":  "Colors Kannada / JioHotstar",
  };
  const officialLink = officialVotingLinks[showSlug] ?? "the official broadcaster";

  return (
    <>
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

      {/* No active poll */}
      {!poll && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <Shield className="w-10 h-10 text-gray-300" />
          <p className="text-gray-500 font-semibold">No active eviction poll this week</p>
          <p className="text-sm text-gray-400 max-w-xs">
            Nominations are discovered automatically each week. Check back soon.
          </p>
        </div>
      )}

      {/* Active poll */}
      {poll && (
        <>
          {/* Countdown */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-400 uppercase tracking-wide font-semibold">
              Nominees
            </span>
            <Countdown closesAt={poll.closesAt} />
          </div>

          {/* Nominees */}
          <div className="space-y-2">
            {poll.nominees.map(n => (
              <NomineeCard
                key={n.contestantId}
                nominee={n}
                voted={votedContestantId === n.contestantId}
                pending={pendingId === n.contestantId}
                onVote={() => handleVote(n)}
              />
            ))}
          </div>

          {votedContestantId !== undefined && (
            <p className="text-center text-xs text-emerald-600 font-semibold mt-3">
              Your vote has been counted. Results update every 30s.
            </p>
          )}
        </>
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
