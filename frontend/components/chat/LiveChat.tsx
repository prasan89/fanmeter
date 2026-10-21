"use client";

import React, {
  useEffect, useRef, useState, useCallback, useId,
} from "react";
import { MessageCircle, Send, ChevronDown, Loader2, WifiOff, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessageDto } from "@/types";
import { useLiveChat, type ChatStatus } from "./useLiveChat";

// ── Helpers ──────────────────────────────────────────────────────────────────

function chatIdempotencyKey(): string {
  return "cik_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(s => s.charAt(0).toUpperCase())
    .join("");
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
  if (diff < 60)  return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ status, onlineCount }: { status: ChatStatus; onlineCount: number }) {
  if (status === "connected") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-[10px] font-semibold text-red-600 uppercase tracking-wide">LIVE</span>
        {onlineCount > 0 && (
          <span className="text-[10px] text-gray-400 ml-1">
            ~{onlineCount.toLocaleString()} watching
          </span>
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

// ── MessageBubble ─────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessageDto }) {
  const color = avatarColor(msg.displayName);
  return (
    <div className={cn("flex items-start gap-2 py-1", msg.isOwn && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black",
          color
        )}
        aria-hidden
      >
        {initials(msg.displayName)}
      </div>
      {/* Bubble */}
      <div className={cn("flex flex-col max-w-[80%]", msg.isOwn && "items-end")}>
        <div className="flex items-baseline gap-1.5 mb-0.5">
          <span className={cn(
            "text-[11px] font-semibold leading-none",
            msg.isOwn ? "text-violet-600" : "text-gray-700"
          )}>
            {msg.isOwn ? "You" : msg.displayName}
          </span>
          <span className="text-[10px] text-gray-300 leading-none">
            {relativeTime(msg.createdAt)}
          </span>
        </div>
        <div className={cn(
          "px-3 py-1.5 rounded-2xl text-sm leading-relaxed break-words",
          msg.isOwn
            ? "bg-violet-600 text-white rounded-tr-sm"
            : "bg-gray-100 text-gray-800 rounded-tl-sm"
        )}>
          {/* messageText is HTML-escaped server-side; render as text only */}
          {msg.messageText
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")}
        </div>
      </div>
    </div>
  );
}

// ── Composer ──────────────────────────────────────────────────────────────────

function Composer({
  onSend,
  disabled,
}: {
  onSend: (text: string, key: string) => Promise<void>;
  disabled: boolean;
}) {
  const [text,    setText]    = useState("");
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputId  = useId();
  const MAX = 500;
  const remaining = MAX - text.length;

  const submit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || disabled) return;
    setSending(true);
    setSendErr(null);
    const key = chatIdempotencyKey();
    try {
      await onSend(trimmed, key);
      setText("");
      inputRef.current?.focus();
    } catch (e) {
      setSendErr(e instanceof Error ? e.message : "Failed to send. Try again.");
    } finally {
      setSending(false);
    }
  }, [text, sending, disabled, onSend]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="border-t border-gray-100 bg-white p-2">
      {sendErr && (
        <p role="alert" className="text-[11px] text-red-500 mb-1.5 px-1">{sendErr}</p>
      )}
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <label htmlFor={inputId} className="sr-only">Chat message</label>
          <textarea
            id={inputId}
            ref={inputRef}
            value={text}
            onChange={e => {
              if (e.target.value.length <= MAX) setText(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Chat with fans…"
            rows={1}
            disabled={disabled || sending}
            className={cn(
              "w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm",
              "placeholder:text-gray-400 leading-snug max-h-28 overflow-y-auto",
              "focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors"
            )}
            aria-label="Chat message"
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
          {sending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Send className="w-4 h-4" />}
        </button>
      </div>
      <div className="flex items-center justify-between mt-1 px-1">
        <span className="text-[10px] text-gray-300">
          Enter to send · Shift+Enter for new line
        </span>
        <span className={cn(
          "text-[10px] tabular-nums",
          remaining < 50 ? "text-red-400" : "text-gray-300"
        )}>
          {remaining}
        </span>
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
    messages, status, error, displayName,
    hasMore, loadOlder, sendMessage,
  } = useLiveChat(roomId);

  const scrollRef   = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const [showScroll, setShowScroll] = useState(false);
  const [onlineCount] = useState(0); // future: fetch from /online-count

  // Scroll tracking
  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    atBottomRef.current = distFromBottom < 80;
    setShowScroll(!atBottomRef.current);
  }

  // Auto-scroll on new messages only when already at bottom
  useEffect(() => {
    if (atBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function scrollToBottom() {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setShowScroll(false);
    }
  }

  const isOffline  = status === "offline";
  const isSendable = status === "connected" || status === "reconnecting";

  return (
    <div
      className={cn(
        "flex flex-col bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm",
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
      {hasMore && (
        <button
          onClick={loadOlder}
          className="w-full text-[11px] text-violet-500 font-semibold py-1.5 hover:bg-violet-50 transition-colors border-b border-gray-100 flex-shrink-0"
        >
          Load earlier messages
        </button>
      )}

      {/* Message list */}
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
          <MessageBubble key={msg.id} msg={msg} />
        ))}
      </div>

      {/* Scroll-to-bottom button */}
      {showScroll && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-20 right-4 w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
          aria-label="Scroll to latest messages"
        >
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </button>
      )}

      {/* Identity notice */}
      {displayName && (
        <div className="px-3 py-1 bg-gray-50 border-t border-gray-100 flex-shrink-0">
          <p className="text-[10px] text-gray-400">
            Chatting as <span className="font-semibold text-gray-600">{displayName}</span>
          </p>
        </div>
      )}

      {/* Composer */}
      <Composer onSend={sendMessage} disabled={isOffline} />
    </div>
  );
}
