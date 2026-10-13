"use client";

import React, { useEffect, useState, useCallback } from "react";
import { RefreshCw, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EvictionNomineeDto {
  contestantId: number;
  contestantName: string;
  voteCount: number;
  rank: number;
}

interface EvictionPollDto {
  id: number;
  seasonId: number;
  weekNumber: number;
  weekLabel: string | null;
  status: "draft" | "open" | "closed" | "archived";
  sourceVerified: boolean;
  nominees: EvictionNomineeDto[];
  opensAt: string | null;
  closesAt: string | null;
}

interface SyncLog {
  id: number;
  showSlug: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  sourcesChecked: number;
  nomineesFound: number;
  conflictsFound: number;
  errorDetail: string | null;
}

interface SyncStatus {
  recentLogs: SyncLog[];
}

// ── Config ────────────────────────────────────────────────────────────────────

const SHOWS = [
  { slug: "bigg-boss-tamil",    name: "BB Tamil 10",    seasonId: 6 },
  { slug: "bigg-boss-telugu",   name: "BB Telugu 10",   seasonId: 7 },
  { slug: "bigg-boss-malayalam", name: "BB Malayalam 8", seasonId: 8 },
  { slug: "bigg-boss-kannada",  name: "BB Kannada 13",  seasonId: 9 },
] as const;

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const AUTH_KEY = "fanmeter_admin_secret";

// ── API helpers ───────────────────────────────────────────────────────────────

async function adminFetch(path: string, method = "GET", body?: unknown, secret?: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Secret": secret ?? "",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  return res;
}

// ── Pill ──────────────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const palette: Record<string, string> = {
    draft:    "bg-gray-100 text-gray-600",
    open:     "bg-green-100 text-green-700",
    closed:   "bg-red-100 text-red-600",
    archived: "bg-gray-200 text-gray-500",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${palette[status] ?? "bg-gray-100 text-gray-500"}`}>
      {status}
    </span>
  );
}

// ── ShowPanel ─────────────────────────────────────────────────────────────────

function ShowPanel({
  show,
  secret,
  onMessage,
}: {
  show: { slug: string; name: string; seasonId: number };
  secret: string;
  onMessage: (msg: string) => void;
}) {
  const [polls,       setPolls]       = useState<EvictionPollDto[]>([]);
  const [expanded,    setExpanded]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [newWeek,     setNewWeek]     = useState("");
  const [newLabel,    setNewLabel]    = useState("");
  const [nomineeIds,  setNomineeIds]  = useState("");
  const [targetPoll,  setTargetPoll]  = useState<number | null>(null);

  const loadPolls = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch(`/api/admin/eviction/polls/season/${show.seasonId}`, "GET", undefined, secret);
      const json = await res.json();
      if (json.success) setPolls(json.data as EvictionPollDto[]);
    } finally {
      setLoading(false);
    }
  }, [show.seasonId, secret]);

  useEffect(() => {
    if (expanded) loadPolls();
  }, [expanded, loadPolls]);

  async function createPoll() {
    if (!newWeek) return;
    const res = await adminFetch("/api/admin/eviction/polls", "POST", {
      seasonId: show.seasonId,
      weekNumber: parseInt(newWeek, 10),
      weekLabel: newLabel || undefined,
      voteMode: "save",
    }, secret);
    const json = await res.json();
    onMessage(json.success ? `Created poll week ${newWeek}` : json.message);
    setNewWeek(""); setNewLabel("");
    loadPolls();
  }

  async function openPoll(pollId: number) {
    const res = await adminFetch(`/api/admin/eviction/polls/${pollId}/open`, "PUT", undefined, secret);
    const json = await res.json();
    onMessage(json.success ? "Poll opened" : json.message);
    loadPolls();
  }

  async function closePoll(pollId: number) {
    const res = await adminFetch(`/api/admin/eviction/polls/${pollId}/close`, "PUT", undefined, secret);
    const json = await res.json();
    onMessage(json.success ? "Poll closed" : json.message);
    loadPolls();
  }

  async function setNominees(pollId: number) {
    const ids = nomineeIds.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    if (!ids.length) { onMessage("Enter comma-separated contestant IDs"); return; }
    const res = await adminFetch(`/api/admin/eviction/polls/${pollId}/nominees`, "PUT",
      { contestantIds: ids, addedBy: "admin" }, secret);
    const json = await res.json();
    onMessage(json.success ? `Set ${ids.length} nominees` : json.message);
    setNomineeIds(""); setTargetPoll(null);
    loadPolls();
  }

  const activePoll = polls.find(p => p.status === "open");

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-gray-800">{show.name}</span>
          {activePoll && <StatusPill status="open" />}
        </div>
        {loading
          ? <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
          : expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-5 border-t border-gray-100">
          {/* Create poll */}
          <div className="pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Create New Poll</p>
            <div className="flex gap-2 flex-wrap">
              <input
                type="number"
                placeholder="Week #"
                value={newWeek}
                onChange={e => setNewWeek(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
              <input
                type="text"
                placeholder="Label e.g. Week 8 (Oct 28–Nov 3)"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-40 focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
              <button
                onClick={createPoll}
                className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
              >
                Create
              </button>
            </div>
          </div>

          {/* Poll list */}
          {polls.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No polls yet for this show.</p>
          )}
          {polls.map(poll => (
            <div key={poll.id} className="border border-gray-100 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800">
                    {poll.weekLabel ?? `Week ${poll.weekNumber}`}
                  </span>
                  <StatusPill status={poll.status} />
                  {poll.sourceVerified && (
                    <span className="text-[10px] text-green-600 font-bold">✓ Verified</span>
                  )}
                </div>
                <span className="text-xs text-gray-400">ID: {poll.id}</span>
              </div>

              {/* Nominees summary */}
              {poll.nominees.length > 0 && (
                <p className="text-xs text-gray-500">
                  Nominees: {poll.nominees.map(n => n.contestantName).join(", ")}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                {poll.status === "draft" && (
                  <button onClick={() => openPoll(poll.id)}
                    className="text-xs bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-1 rounded-lg transition-colors">
                    Open Poll
                  </button>
                )}
                {poll.status === "open" && (
                  <button onClick={() => closePoll(poll.id)}
                    className="text-xs bg-red-600 hover:bg-red-700 text-white font-semibold px-3 py-1 rounded-lg transition-colors">
                    Close Poll
                  </button>
                )}
                <button onClick={() => setTargetPoll(targetPoll === poll.id ? null : poll.id)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-3 py-1 rounded-lg transition-colors">
                  Set Nominees
                </button>
              </div>

              {/* Set nominees inline */}
              {targetPoll === poll.id && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Contestant IDs (comma-separated)"
                    value={nomineeIds}
                    onChange={e => setNomineeIds(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                  <button onClick={() => setNominees(poll.id)}
                    className="text-xs bg-violet-600 hover:bg-violet-700 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors">
                    Save
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SyncPanel ─────────────────────────────────────────────────────────────────

function SyncPanel({ secret, onMessage }: { secret: string; onMessage: (m: string) => void }) {
  const [status,    setStatus]    = useState<SyncStatus | null>(null);
  const [syncing,   setSyncing]   = useState(false);
  const [showSlug,  setShowSlug]  = useState("");

  async function loadStatus() {
    const res = await adminFetch("/api/admin/nomination-sync/status", "GET", undefined, secret);
    const json = await res.json();
    if (json.success) setStatus(json.data as SyncStatus);
  }

  useEffect(() => { loadStatus(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function triggerSync() {
    setSyncing(true);
    try {
      const qs = showSlug ? `?show=${encodeURIComponent(showSlug)}` : "";
      const res = await adminFetch(`/api/admin/nomination-sync/trigger${qs}`, "POST", undefined, secret);
      const json = await res.json();
      onMessage(json.success ? "Sync completed" : `Sync: ${json.message}`);
      loadStatus();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
      <p className="font-bold text-gray-800">Nomination Sync</p>
      <div className="flex gap-2">
        <select
          value={showSlug}
          onChange={e => setShowSlug(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          <option value="">All shows</option>
          {SHOWS.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
        </select>
        <button
          onClick={triggerSync}
          disabled={syncing}
          className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors flex items-center gap-1"
        >
          {syncing && <RefreshCw className="w-3 h-3 animate-spin" />}
          {syncing ? "Running..." : "Trigger Sync"}
        </button>
      </div>
      {status?.recentLogs?.length ? (
        <div className="space-y-1.5">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Recent runs</p>
          {status.recentLogs.slice(0, 5).map(log => (
            <div key={log.id} className="flex items-center gap-2 text-xs text-gray-600">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                log.status === "success" ? "bg-green-500" :
                log.status === "failed"  ? "bg-red-500" :
                log.status === "partial" ? "bg-amber-500" : "bg-gray-400"
              }`} />
              <span className="font-medium">{log.showSlug || "all"}</span>
              <span>{new Date(log.startedAt).toLocaleString()}</span>
              <span className="text-gray-400">· {log.nomineesFound} nominees</span>
              {log.errorDetail && <span className="text-red-400 truncate max-w-32">{log.errorDetail}</span>}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ── Main Admin Page ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const [secret,    setSecret]    = useState("");
  const [authed,    setAuthed]    = useState(false);
  const [authError, setAuthError] = useState(false);
  const [messages,  setMessages]  = useState<string[]>([]);

  useEffect(() => {
    const stored = sessionStorage.getItem(AUTH_KEY);
    if (stored) { setSecret(stored); setAuthed(true); }
  }, []);

  async function login() {
    const res = await adminFetch("/api/admin/nomination-sync/status", "GET", undefined, secret);
    if (res.ok) {
      sessionStorage.setItem(AUTH_KEY, secret);
      setAuthed(true);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  }

  function logout() {
    sessionStorage.removeItem(AUTH_KEY);
    setAuthed(false);
    setSecret("");
  }

  function addMessage(msg: string) {
    setMessages(prev => [msg, ...prev].slice(0, 5));
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-4">
          <h1 className="text-xl font-bold text-gray-800 text-center">FanMeter Admin</h1>
          <input
            type="password"
            placeholder="Admin secret"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            onKeyDown={e => e.key === "Enter" && login()}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
          {authError && (
            <p className="text-xs text-red-500 text-center flex items-center justify-center gap-1">
              <AlertCircle className="w-3 h-3" /> Incorrect secret
            </p>
          )}
          <button
            onClick={login}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">FanMeter Admin</h1>
          <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Sign out
          </button>
        </div>

        {/* Toast messages */}
        {messages.length > 0 && (
          <div className="space-y-1">
            {messages.map((m, i) => (
              <div key={i} className="text-xs bg-violet-50 border border-violet-100 text-violet-700 rounded-xl px-4 py-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0" />
                {m}
              </div>
            ))}
          </div>
        )}

        {/* Sync panel */}
        <SyncPanel secret={secret} onMessage={addMessage} />

        {/* Show panels */}
        {SHOWS.map(show => (
          <ShowPanel key={show.slug} show={show} secret={secret} onMessage={addMessage} />
        ))}
      </div>
    </div>
  );
}
