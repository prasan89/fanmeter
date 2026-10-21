"use client";

import React, {
  useEffect, useRef, useState, useCallback, useId,
} from "react";
import {
  MessageCircle, Send, ChevronDown, Loader2, WifiOff,
  Flag, AlertTriangle, Clock, Ban, Edit2, Check, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessageDto, ReportCategory } from "@/types";
import { reportChatMessage } from "@/lib/api";
import { useLiveChat, type ChatStatus } from "./useLiveChat";

// ── Helpers ──────────────────────────────────────────────────────────────────

function chatIdempotencyKey(): string {
  return "cik_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map(s => s.charAt(0).toUpperCase()).join("");
}

function avatarColor(name: string): string {
  const colors = [
    "bg-violet-100 text-violet-600",
    "bg-pink-100 text-pink-600",
    "bg-rose-100 text-rose-600",
    "bg-amber-100 text-amber-600",
    "bg-emerald-100 text-emerald-600",
    "bg-sky-100 text-sky-600",
    "bg-indigo-100 text-indigo-600",
    "bg-orange-100 text-orange-600",
  ];
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return colors[hash % colors.length];
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
  { value: "HARASSMENT",    label: "Harassment or bullying" },
  { value: "HATE_SPEECH",   label: "Hate speech" },
  { value: "THREAT",        label: "Threats or violence" },
  { value: "SEXUAL_CONTENT",label: "Sexual content" },
  { value: "SPAM",          label: "Spam or scam" },
  { value: "PRIVATE_INFO",  label: "Private information" },
  { value: "OTHER",         label: "Other safety concern" },
];

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ status, onlineCount }: { status: ChatStatus; onlineCount: number }) {
  if (status === "connected") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-[10px] font-semibold text-red-600 uppercase tracking-wide">LIVE</span>
        {onlineCount > 0 && (
          <span className="text-[10px] text-gray-400 ml-1">~{onlineCount.toLocaleString()} watching</span>
        )}
      </div>
    );
  }
  if (status === "reconnecting") {
    return (
      <div className="flex items-center gap-1.5">
        <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
        <span className="text-[10px] text-amber-600 font-medium">Reconnecting…</span>
      </div>
    );
  }
  if (status === "offline") {
    return (
      <div className="flex items-center gap-1.5">
        <WifiOff className="w-3 h-3 text-gray-400" />
        <span className="text-[10px] text-gray-400">Offline</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <Loader2 className="w-3 h-3 animate-spin text-violet-500" />
      <span className="text-[10px] text-violet-600 font-medium">Connecting…</span>
    </div>
  );
}

// ── NameGate ──────────────────────────────────────────────────────────────────

interface NameGateProps {
  currentName: string | null;
  onConfirm: (name: string) => Promise<void>;
  mode: "initial" | "edit";
  onCancel?: () => void;
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
    const clientErr = validateClient(trimmed);
    if (clientErr) { setError(clientErr); return; }
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
    <div className="flex flex-col items-center justify-center px-4 py-6 gap-4 flex-1">
      {mode === "initial" && (
        <>
          <MessageCircle className="w-8 h-8 text-violet-400" aria-hidden />
          <div className="text-center">
            <p className="text-sm font-bold text-gray-900">Join the conversation</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Choose a name to start chatting</p>
          </div>
        </>
      )}
      {mode === "edit" && (
        <p className="text-sm font-bold text-gray-900">Change your display name</p>
      )}
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
            "w-full rounded-xl border px-3 py-2 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400",
            error ? "border-red-300" : "border-gray-200"
          )}
        />
        {error && <p className="text-[11px] text-red-500 px-1">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className={cn(
              "flex-1 py-2 rounded-xl text-sm font-semibold text-white",
              "bg-violet-600 hover:bg-violet-700 transition-colors",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> :
              mode === "initial" ? "Start Chatting" : "Save"}
          </button>
          {mode === "edit" && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
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
  roomId: string;
  messageId: number;
  reporterToken: string;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<ReportCategory["value"] | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

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
      <div className="absolute right-0 top-6 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-52">
        <div className="flex items-center gap-2 text-emerald-600">
          <Check className="w-4 h-4" />
          <span className="text-xs font-semibold">Report submitted</span>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute right-0 top-6 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-2 w-56">
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
              ? "bg-violet-50 text-violet-700 font-medium"
              : "text-gray-600 hover:bg-gray-50"
          )}
        >
          {cat.label}
        </button>
      ))}
      <button
        onClick={handleSubmit}
        disabled={!selected || loading}
        className={cn(
          "w-full mt-1.5 py-1.5 rounded-lg text-xs font-semibold text-white",
          "bg-violet-600 hover:bg-violet-700 transition-colors",
          "disabled:opacity-40 disabled:cursor-not-allowed"
        )}
      >
        {loading ? "Sending…" : "Submit report"}
      </button>
    </div>
  );
}

// ── MessageBubble ─────────────────────────────────────────────────────────────

function MessageBubble({
  msg, roomId, guestToken,
}: {
  msg: ChatMessageDto;
  roomId: string;
  guestToken: string | null;
}) {
  const [showReport, setShowReport] = useState(false);
  const color = avatarColor(msg.displayName);

  return (
    <div className={cn("flex items-start gap-2 py-1 group relative", msg.isOwn && "flex-row-reverse")}>
      <div
        className={cn(
          "w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black",
          color
        )}
        aria-hidden
      >
        {initials(msg.displayName)}
      </div>
      <div className={cn("flex flex-col max-w-[80%]", msg.isOwn && "items-end")}>
        <div className="flex items-baseline gap-1.5 mb-0.5">
          <span className={cn(
            "text-[11px] font-semibold leading-none",
            msg.isOwn ? "text-violet-600" : "text-gray-700"
          )}>
            {msg.isOwn ? "You" : msg.displayName}
          </span>
          <span className="text-[10px] text-gray-300 leading-none">{relativeTime(msg.createdAt)}</span>
        </div>
        <div className={cn(
          "px-3 py-1.5 rounded-2xl text-sm leading-relaxed break-words",
          msg.isOwn
            ? "bg-violet-600 text-white rounded-tr-sm"
            : "bg-gray-100 text-gray-800 rounded-tl-sm"
        )}>
          {decodeHtml(msg.messageText)}
        </div>
      </div>
      {/* Report button — only shown on hover for others' messages */}
      {!msg.isOwn && guestToken && (
        <div className="relative self-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setShowReport(v => !v)}
            className="p-1 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-500"
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
  onSend: (text: string, key: string) => Promise<import("@/types").SendMessageResponse>;
  disabled: boolean;
  warningMessage: string | null;
  clearWarning: () => void;
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
        // Don't clear input — user may want to edit
      } else {
        setText("");
        inputRef.current?.focus();
        if (resp.userMessage && resp.moderationDecision === "ALLOW_WITH_WARNING") {
          // warning is shown in the chat header area, not here
        }
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

  const remaining = MAX - text.length;

  return (
    <div className="border-t border-gray-100 bg-white p-2">
      {warningMessage && (
        <p role="alert" className="text-[11px] text-amber-600 mb-1.5 px-1 flex items-start gap-1">
          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          {warningMessage}
        </p>
      )}
      {sendErr && (
        <p role="alert" className="text-[11px] text-red-500 mb-1.5 px-1">{sendErr}</p>
      )}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label htmlFor={inputId} className="sr-only">Chat message</label>
          <textarea
            id={inputId}
            ref={inputRef}
            value={text}
            onChange={e => { if (e.target.value.length <= MAX) setText(e.target.value); }}
            onKeyDown={handleKeyDown}
            placeholder="Chat with fans…"
            rows={1}
            disabled={disabled || sending}
            className={cn(
              "w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm",
              "placeholder:text-gray-400 leading-snug max-h-28 overflow-y-auto",
              "focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400",
              "disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            )}
          />
        </div>
        <button
          onClick={submit}
          disabled={!text.trim() || sending || disabled}
          aria-label="Send message"
          className={cn(
            "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center",
            "bg-violet-600 text-white hover:bg-violet-700 transition-colors",
            "disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none",
            "focus:ring-2 focus:ring-violet-400 focus:ring-offset-1"
          )}
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
      <div className="flex items-center justify-between mt-1 px-1">
        <span className="text-[10px] text-gray-300">Enter to send · Shift+Enter for newline</span>
        <span className={cn("text-[10px] tabular-nums", remaining < 50 ? "text-red-400" : "text-gray-300")}>
          {remaining}
        </span>
      </div>
    </div>
  );
}

// ── TimeoutBanner ─────────────────────────────────────────────────────────────

function TimeoutBanner({ expiresAt }: { expiresAt: number | null }) {
  const [remaining, setRemaining] = useState<string>("");

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
    <div className="mx-3 my-2 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
      <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-semibold text-amber-800">You are temporarily restricted from chat.</p>
        {remaining && (
          <p className="text-[11px] text-amber-600 mt-0.5">Time remaining: {remaining}</p>
        )}
      </div>
    </div>
  );
}

function BanBanner() {
  return (
    <div className="mx-3 my-2 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
      <Ban className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-semibold text-red-800">You are restricted from this chat.</p>
        <p className="text-[11px] text-red-600 mt-0.5">
          You may appeal at <span className="underline">fanmeter.com/chat-appeal</span>.
        </p>
      </div>
    </div>
  );
}

// ── LiveChat (main export) ────────────────────────────────────────────────────

interface LiveChatProps {
  roomId:    string;
  className?: string;
}

export function LiveChat({ roomId, className }: LiveChatProps) {
  const {
    messages, status, error, guestToken, displayName, isNameSet,
    restriction, hasMore, unreadCount,
    clearUnread, setAtBottom, loadOlder, sendMessage, setDisplayName,
  } = useLiveChat(roomId);

  const scrollRef      = useRef<HTMLDivElement>(null);
  const [showScroll,   setShowScroll]   = useState(false);
  const [showNameEdit, setShowNameEdit] = useState(false);
  const [warningMsg,   setWarningMsg]   = useState<string | null>(null);
  const [onlineCount] = useState(0);

  // Scroll tracking
  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distFromBottom < 80;
    setAtBottom(atBottom);
    setShowScroll(!atBottom);
    if (atBottom && unreadCount > 0) clearUnread();
  }

  // Auto-scroll when at bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distFromBottom < 80) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  function scrollToBottom() {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setShowScroll(false);
      clearUnread();
    }
  }

  async function handleSend(text: string, key: string) {
    const resp = await sendMessage(text, key);
    if (resp.userMessage && resp.moderationDecision === "ALLOW_WITH_WARNING") {
      setWarningMsg(resp.userMessage);
    }
    return resp;
  }

  const isOffline   = status === "offline";
  const isSendable  = !isOffline && restriction?.type !== "ban";
  const isTimedOut  = restriction?.type === "timeout";
  const isBanned    = restriction?.type === "ban";

  // Show NameGate if name hasn't been set by user yet (or edit mode requested)
  const showNameGate = !isNameSet && !isOffline && status !== "connecting";

  return (
    <div
      className={cn(
        "flex flex-col bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm relative",
        className
      )}
      aria-label="Live fan chat"
      role="region"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-violet-500" aria-hidden />
          <span className="text-sm font-black text-gray-900">Live Chat</span>
        </div>
        <StatusBadge status={status} onlineCount={onlineCount} />
      </div>

      {/* Load older */}
      {hasMore && !showNameGate && (
        <button
          onClick={loadOlder}
          className="w-full text-[11px] text-violet-500 font-semibold py-1.5 hover:bg-violet-50 transition-colors border-b border-gray-100 flex-shrink-0"
        >
          Load earlier messages
        </button>
      )}

      {/* Name gate or message list */}
      {showNameGate && !showNameEdit ? (
        <NameGate
          currentName={null}
          onConfirm={setDisplayName}
          mode="initial"
        />
      ) : showNameEdit ? (
        <NameGate
          currentName={displayName}
          onConfirm={async (name) => { await setDisplayName(name); setShowNameEdit(false); }}
          mode="edit"
          onCancel={() => setShowNameEdit(false)}
        />
      ) : (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 min-h-0"
          aria-live="polite"
          aria-label="Chat messages"
        >
          {status === "connecting" && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-10 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-violet-300" />
              <p className="text-xs text-gray-400">Loading chat…</p>
            </div>
          )}
          {isOffline && (
            <div className="flex flex-col items-center justify-center h-full py-10 gap-2">
              <WifiOff className="w-6 h-6 text-gray-300" />
              <p className="text-xs text-gray-400 text-center max-w-[200px]">
                Chat is unavailable. The rest of the page works normally.
              </p>
            </div>
          )}
          {error && !isOffline && (
            <p role="alert" className="text-xs text-amber-600 py-2 text-center">{error}</p>
          )}
          {!isOffline && messages.length === 0 && status === "connected" && (
            <div className="flex flex-col items-center justify-center h-full py-10 gap-2">
              <MessageCircle className="w-7 h-7 text-gray-200" />
              <p className="text-xs text-gray-400">Be the first to chat!</p>
            </div>
          )}
          {messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} roomId={roomId} guestToken={guestToken} />
          ))}
        </div>
      )}

      {/* New messages indicator */}
      {showScroll && unreadCount > 0 && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-32 left-1/2 -translate-x-1/2 px-3 py-1 bg-violet-600 text-white text-[11px] font-semibold rounded-full shadow-md hover:bg-violet-700 transition-colors z-10"
          aria-label="Scroll to new messages"
        >
          {unreadCount} new message{unreadCount > 1 ? "s" : ""} ↓
        </button>
      )}

      {/* Scroll-to-bottom button (when scrolled up, no unread) */}
      {showScroll && unreadCount === 0 && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-28 right-4 w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
          aria-label="Scroll to latest messages"
        >
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </button>
      )}

      {/* Timeout / ban banners */}
      {isTimedOut && <TimeoutBanner expiresAt={restriction.expiresAt} />}
      {isBanned    && <BanBanner />}

      {/* Identity bar */}
      {displayName && !showNameGate && !showNameEdit && (
        <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 flex-shrink-0 flex items-center justify-between">
          <p className="text-[10px] text-gray-400">
            Chatting as <span className="font-semibold text-gray-600">{displayName}</span>
          </p>
          <button
            onClick={() => setShowNameEdit(true)}
            className="flex items-center gap-0.5 text-[10px] text-violet-500 hover:text-violet-700 transition-colors"
            aria-label="Change display name"
          >
            <Edit2 className="w-2.5 h-2.5" />
            <span>Change</span>
          </button>
        </div>
      )}

      {/* Composer */}
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
