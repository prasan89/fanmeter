"use client";

import React, {
  useEffect, useRef, useState, useCallback, useId,
} from "react";
import {
  Send, ChevronDown, Loader2, WifiOff,
  Flag, AlertTriangle, Clock, Ban, Edit2, Check, X, MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessageDto, ReportCategory } from "@/types";
import { reportChatMessage } from "@/lib/api";
import { useLiveChat, type ChatStatus } from "./useLiveChat";

// ── Helpers ───────────────────────────────────────────────────────────────────

function chatIdempotencyKey(): string {
  return "cik_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map(s => s.charAt(0).toUpperCase()).join("");
}

// Distinct muted background colors for avatars — neutral palette matching the screenshot
const AVATAR_COLORS = [
  "bg-slate-500",
  "bg-stone-500",
  "bg-zinc-600",
  "bg-neutral-500",
  "bg-gray-500",
  "bg-teal-600",
  "bg-indigo-500",
  "bg-violet-600",
  "bg-rose-500",
  "bg-amber-600",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

const DISPLAY_NAME_REGEX = /^[A-Za-z0-9 _\-]+$/;

const REPORT_CATEGORIES: ReportCategory[] = [
  { value: "HARASSMENT",     label: "Harassment or bullying" },
  { value: "HATE_SPEECH",    label: "Hate speech" },
  { value: "THREAT",         label: "Threats or violence" },
  { value: "SEXUAL_CONTENT", label: "Sexual content" },
  { value: "SPAM",           label: "Spam or scam" },
  { value: "PRIVATE_INFO",   label: "Private information" },
  { value: "OTHER",          label: "Other safety concern" },
];

// ── NameGate ──────────────────────────────────────────────────────────────────

interface NameGateProps {
  currentName: string | null;
  onConfirm:   (name: string) => Promise<void>;
  mode:        "initial" | "edit";
  onCancel?:   () => void;
}

function NameGate({ currentName, onConfirm, mode, onCancel }: NameGateProps) {
  const [name,    setName]    = useState(mode === "edit" ? (currentName ?? "") : "");
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputId = useId();

  function validateClient(v: string): string | null {
    const t = v.trim();
    if (t.length < 3)  return "Name must be at least 3 characters.";
    if (t.length > 24) return "Name must be at most 24 characters.";
    if (!DISPLAY_NAME_REGEX.test(t)) return "Letters, numbers, spaces, _ and - only.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    const err = validateClient(trimmed);
    if (err) { setError(err); return; }
    setLoading(true);
    setError(null);
    try {
      await onConfirm(trimmed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not set name.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center px-5 py-8 gap-4 flex-1 bg-white">
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-900">
          {mode === "initial" ? "Join the conversation" : "Change your display name"}
        </p>
        {mode === "initial" && (
          <p className="text-xs text-gray-400 mt-1">Choose a name to start chatting</p>
        )}
      </div>
      <form onSubmit={handleSubmit} className="w-full max-w-[260px] flex flex-col gap-2">
        <label htmlFor={inputId} className="sr-only">Fan name</label>
        <input
          id={inputId}
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setError(null); }}
          placeholder="e.g. TamilFan2026"
          maxLength={24}
          autoFocus
          className={cn(
            "w-full rounded-lg border px-3 py-2 text-sm",
            "focus:outline-none focus:ring-1 focus:ring-red-400 focus:border-red-400",
            error ? "border-red-300" : "border-gray-300"
          )}
        />
        {error && <p className="text-[11px] text-red-500 px-0.5">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="flex-1 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              : mode === "initial" ? "Start Chatting" : "Save"}
          </button>
          {mode === "edit" && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
        <p className="text-[10px] text-gray-400 text-center">
          3–24 characters · letters, numbers, spaces, _ and -
        </p>
      </form>
    </div>
  );
}

// ── ReportMenu ────────────────────────────────────────────────────────────────

function ReportMenu({
  roomId, messageId, reporterToken, onClose,
}: {
  roomId:        string;
  messageId:     number;
  reporterToken: string;
  onClose:       () => void;
}) {
  const [selected,  setSelected]  = useState<ReportCategory["value"] | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);

  async function handleSubmit() {
    if (!selected) return;
    setLoading(true);
    try {
      await reportChatMessage(roomId, messageId, reporterToken, selected);
      setSubmitted(true);
      setTimeout(onClose, 1500);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="absolute right-0 top-5 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-48">
        <div className="flex items-center gap-2 text-emerald-600">
          <Check className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Report submitted</span>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute right-0 top-5 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-2 w-52">
      <div className="flex items-center justify-between px-1 py-0.5 mb-1">
        <span className="text-[11px] font-semibold text-gray-700">Report message</span>
        <button onClick={onClose} className="p-0.5 hover:bg-gray-100 rounded">
          <X className="w-3 h-3 text-gray-400" />
        </button>
      </div>
      {REPORT_CATEGORIES.map(cat => (
        <button
          key={cat.value}
          onClick={() => setSelected(cat.value)}
          className={cn(
            "w-full text-left px-2 py-1.5 text-xs rounded-lg transition-colors",
            selected === cat.value
              ? "bg-red-50 text-red-700 font-medium"
              : "text-gray-600 hover:bg-gray-50"
          )}
        >
          {cat.label}
        </button>
      ))}
      <button
        onClick={handleSubmit}
        disabled={!selected || loading}
        className="w-full mt-1.5 py-1.5 rounded-lg text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? "Sending…" : "Submit report"}
      </button>
    </div>
  );
}

// ── CommentRow ────────────────────────────────────────────────────────────────
// YouTube-style: avatar | username · timestamp \n message text

function CommentRow({
  msg, roomId, guestToken,
}: {
  msg:        ChatMessageDto;
  roomId:     string;
  guestToken: string | null;
}) {
  const [showReport, setShowReport] = useState(false);
  const bg = avatarColor(msg.displayName);

  return (
    <div className="flex items-start gap-3 py-2.5 px-4 group relative hover:bg-gray-50 transition-colors">
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center",
          "text-[11px] font-bold text-white select-none",
          bg
        )}
        aria-hidden
      >
        {initials(msg.displayName)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Username + timestamp on one line */}
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-[13px] font-semibold text-gray-900 leading-none">
            {msg.displayName}
          </span>
          <span className="text-[11px] text-gray-400 leading-none">
            {relativeTime(msg.createdAt)}
          </span>
          {msg.automated && (
            <span className="text-[9px] font-semibold uppercase tracking-wide text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded leading-none">
              Auto
            </span>
          )}
        </div>
        {/* Message text on next line */}
        <p className="text-[13px] text-gray-700 leading-snug mt-0.5 break-words">
          {decodeHtml(msg.messageText)}
        </p>
      </div>

      {/* Report button — hover only, not own messages */}
      {!msg.isOwn && guestToken && (
        <div className="relative self-start mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={() => setShowReport(v => !v)}
            className="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Report message"
          >
            <Flag className="w-3 h-3" />
          </button>
          {showReport && (
            <ReportMenu
              roomId={roomId}
              messageId={msg.id}
              reporterToken={guestToken}
              onClose={() => setShowReport(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Composer ──────────────────────────────────────────────────────────────────

function Composer({
  onSend,
  disabled,
  warningMessage,
  clearWarning,
}: {
  onSend:         (text: string, key: string) => Promise<import("@/types").SendMessageResponse>;
  disabled:       boolean;
  warningMessage: string | null;
  clearWarning:   () => void;
}) {
  const [text,    setText]    = useState("");
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputId  = useId();
  const MAX = 500;

  const submit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || disabled) return;
    setSending(true);
    setSendErr(null);
    clearWarning();
    const key = chatIdempotencyKey();
    try {
      const resp = await onSend(trimmed, key);
      if (resp.moderationDecision === "BLOCK") {
        setSendErr(resp.userMessage ?? "Message could not be sent.");
      } else {
        setText("");
        inputRef.current?.focus();
      }
    } catch (e) {
      setSendErr(e instanceof Error ? e.message : "Failed to send. Try again.");
    } finally {
      setSending(false);
    }
  }, [text, sending, disabled, onSend, clearWarning]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const charCount = text.length;

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3 flex-shrink-0">
      {warningMessage && (
        <p role="alert" className="text-[11px] text-amber-600 mb-2 flex items-start gap-1">
          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          {warningMessage}
        </p>
      )}
      {sendErr && (
        <p role="alert" className="text-[11px] text-red-500 mb-2">{sendErr}</p>
      )}

      {/* Input row — matches the screenshot's single rounded input + send icon */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <label htmlFor={inputId} className="sr-only">Chat message</label>
          <textarea
            id={inputId}
            ref={inputRef}
            value={text}
            onChange={e => { if (e.target.value.length <= MAX) setText(e.target.value); }}
            onKeyDown={handleKeyDown}
            placeholder="Chat with fans..."
            rows={1}
            disabled={disabled || sending}
            className={cn(
              "w-full resize-none rounded-full border border-gray-300 bg-white",
              "px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400",
              "leading-snug max-h-24 overflow-y-auto",
              "focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400",
              "disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            )}
            style={{ paddingRight: "2.5rem" }}
          />
        </div>

        {/* Send button — small icon-only, red accent when active */}
        <button
          onClick={submit}
          disabled={!text.trim() || sending || disabled}
          aria-label="Send message"
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-1",
            text.trim() && !disabled
              ? "text-red-500 hover:bg-red-50"
              : "text-gray-300 cursor-default"
          )}
        >
          {sending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Send className="w-4 h-4" />}
        </button>
      </div>

      {/* Helper row */}
      <div className="flex items-center justify-between mt-1.5 px-1">
        <span className="text-[10px] text-gray-400">
          Enter to send · Shift+Enter for new line
        </span>
        <span className={cn(
          "text-[10px] tabular-nums",
          charCount > 450 ? "text-red-400" : "text-gray-400"
        )}>
          {charCount}/{MAX}
        </span>
      </div>
    </div>
  );
}

// ── TimeoutBanner ─────────────────────────────────────────────────────────────

function TimeoutBanner({ expiresAt }: { expiresAt: number | null }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const secs = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
      if (secs === 0) { setRemaining(""); return; }
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      setRemaining(m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return (
    <div className="mx-4 my-2 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs">
      <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-medium text-amber-800">You are temporarily restricted from chat.</p>
        {remaining && <p className="text-amber-600 mt-0.5">Time remaining: {remaining}</p>}
      </div>
    </div>
  );
}

function BanBanner() {
  return (
    <div className="mx-4 my-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs">
      <Ban className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-medium text-red-800">You are restricted from this chat.</p>
        <p className="text-red-600 mt-0.5">
          You may appeal at <span className="underline">fanmeter.com/chat-appeal</span>.
        </p>
      </div>
    </div>
  );
}

// ── LiveChat (main export) ────────────────────────────────────────────────────

interface LiveChatProps {
  roomId:     string;
  className?: string;
}

export function LiveChat({ roomId, className }: LiveChatProps) {
  const {
    messages, status, error, guestToken, displayName, isNameSet,
    restriction, hasMore, unreadCount,
    clearUnread, setAtBottom, loadOlder, sendMessage, setDisplayName,
  } = useLiveChat(roomId);

  const scrollRef        = useRef<HTMLDivElement>(null);
  const [showScroll,     setShowScroll]     = useState(false);
  const [showNameEdit,   setShowNameEdit]   = useState(false);
  const [warningMsg,     setWarningMsg]     = useState<string | null>(null);

  // ── Scroll tracking ───────────────────────────────────────────────────────

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = dist < 80;
    setAtBottom(atBottom);
    setShowScroll(!atBottom);
    if (atBottom && unreadCount > 0) clearUnread();
  }

  // Auto-scroll only when already at bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (dist < 80) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function scrollToBottom() {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setShowScroll(false);
      clearUnread();
    }
  }

  // ── Send ──────────────────────────────────────────────────────────────────

  async function handleSend(text: string, key: string) {
    const resp = await sendMessage(text, key);
    if (resp.userMessage && resp.moderationDecision === "ALLOW_WITH_WARNING") {
      setWarningMsg(resp.userMessage);
    }
    return resp;
  }

  // ── State flags ───────────────────────────────────────────────────────────

  const isOffline     = status === "offline";
  const isTimedOut    = restriction?.type === "timeout";
  const isBanned      = restriction?.type === "ban";
  const showNameGate  = !isNameSet && !isOffline && status !== "connecting";
  const isConnected   = status === "connected";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        "flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden relative",
        className
      )}
      aria-label="Comments"
      role="region"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <span className="text-[15px] font-semibold text-gray-900">Comments</span>

        <div className="flex items-center gap-2">
          {/* LIVE pill */}
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "w-2 h-2 rounded-full flex-shrink-0",
              isConnected    ? "bg-red-500 animate-pulse" :
              status === "reconnecting" ? "bg-amber-400 animate-pulse" :
              "bg-gray-300"
            )} />
            <span className={cn(
              "text-[11px] font-semibold tracking-wide uppercase",
              isConnected    ? "text-red-500" :
              status === "reconnecting" ? "text-amber-500" :
              "text-gray-400"
            )}>
              {isConnected ? "LIVE" :
               status === "reconnecting" ? "…" :
               status === "connecting"   ? "…" : "OFFLINE"}
            </span>
          </div>

          {/* Three-dot menu */}
          <button
            onClick={() => setShowNameEdit(v => !v)}
            className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Options"
            title="Change display name"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Load older ── */}
      {hasMore && !showNameGate && !showNameEdit && (
        <button
          onClick={loadOlder}
          className="w-full text-xs text-gray-500 py-1.5 hover:bg-gray-50 transition-colors border-b border-gray-100 flex-shrink-0"
        >
          Load earlier comments
        </button>
      )}

      {/* ── Name gate / edit overlay ── */}
      {showNameGate && !showNameEdit ? (
        <NameGate currentName={null} onConfirm={setDisplayName} mode="initial" />
      ) : showNameEdit ? (
        <NameGate
          currentName={displayName}
          onConfirm={async (name) => { await setDisplayName(name); setShowNameEdit(false); }}
          mode="edit"
          onCancel={() => setShowNameEdit(false)}
        />
      ) : (
        /* ── Comment list ── */
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto min-h-0"
          aria-live="polite"
          aria-label="Comments"
        >
          {/* Loading state */}
          {status === "connecting" && messages.length === 0 && (
            <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">Loading…</span>
            </div>
          )}

          {/* Offline state */}
          {isOffline && (
            <div className="flex flex-col items-center justify-center py-12 gap-2 px-4">
              <WifiOff className="w-5 h-5 text-gray-300" />
              <p className="text-xs text-gray-400 text-center">
                Comments unavailable. The rest of the page works normally.
              </p>
            </div>
          )}

          {/* Error */}
          {error && !isOffline && (
            <p role="alert" className="text-xs text-amber-600 py-3 text-center px-4">{error}</p>
          )}

          {/* Empty connected state */}
          {!isOffline && messages.length === 0 && isConnected && (
            <div className="flex flex-col items-center justify-center py-12 gap-1 text-gray-400">
              <p className="text-xs">Be the first to comment!</p>
            </div>
          )}

          {/* Comment rows */}
          {messages.map(msg => (
            <CommentRow
              key={msg.id}
              msg={msg}
              roomId={roomId}
              guestToken={guestToken}
            />
          ))}
        </div>
      )}

      {/* ── New-messages indicator (pill) ── */}
      {showScroll && unreadCount > 0 && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-[130px] left-1/2 -translate-x-1/2 px-3 py-1 bg-gray-800 text-white text-[11px] font-medium rounded-full shadow-md hover:bg-gray-700 transition-colors z-10"
          aria-label="Scroll to new comments"
        >
          {unreadCount} new comment{unreadCount > 1 ? "s" : ""} ↓
        </button>
      )}

      {/* ── Scroll-to-bottom (no unread) ── */}
      {showScroll && unreadCount === 0 && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-[130px] right-4 w-7 h-7 rounded-full bg-white shadow border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
          aria-label="Scroll to latest comments"
        >
          <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
        </button>
      )}

      {/* ── Timeout / ban banners ── */}
      {isTimedOut && <TimeoutBanner expiresAt={restriction.expiresAt} />}
      {isBanned   && <BanBanner />}

      {/* ── Identity bar (shown above composer) ── */}
      {displayName && !showNameGate && !showNameEdit && (
        <div className="px-4 py-1.5 border-t border-gray-100 flex-shrink-0 flex items-center justify-between bg-white">
          <p className="text-[11px] text-gray-400">
            Chatting as <span className="font-medium text-gray-600">{displayName}</span>
          </p>
          <button
            onClick={() => setShowNameEdit(true)}
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-700 transition-colors"
            aria-label="Change display name"
          >
            <Edit2 className="w-2.5 h-2.5" />
            Change
          </button>
        </div>
      )}

      {/* ── Composer ── */}
      {!showNameGate && !showNameEdit && (
        <Composer
          onSend={handleSend}
          disabled={isOffline || isBanned || isTimedOut}
          warningMessage={warningMsg}
          clearWarning={() => setWarningMsg(null)}
        />
      )}
    </div>
  );
}
