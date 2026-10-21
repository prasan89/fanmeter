"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { ChatMessageDto, SendMessageResponse } from "@/types";
import {
  issueGuestToken, updateChatDisplayName,
  getChatHistory, sendChatMessage, createChatSseUrl,
} from "@/lib/api";

const STORAGE_KEY_TOKEN   = "fanmeter_chat_token";
const STORAGE_KEY_NAME    = "fanmeter_chat_name";
const STORAGE_KEY_NAME_SET = "fanmeter_chat_name_set"; // true when user explicitly chose name
const MAX_MESSAGES        = 100;
const RECONNECT_BASE_MS   = 2_000;
const RECONNECT_MAX_MS    = 30_000;

export type ChatStatus = "connecting" | "connected" | "reconnecting" | "offline";

export interface RestrictionState {
  type: "timeout" | "ban";
  expiresAt: number | null; // epoch seconds; null = permanent ban
}

export interface UseLiveChatReturn {
  messages:       ChatMessageDto[];
  status:         ChatStatus;
  error:          string | null;
  guestToken:     string | null;
  displayName:    string | null;
  isNameSet:      boolean;
  restriction:    RestrictionState | null;
  hasMore:        boolean;
  unreadCount:    number;
  clearUnread:    () => void;
  setAtBottom:    (v: boolean) => void;
  loadOlder:      () => Promise<void>;
  sendMessage:    (text: string, idempotencyKey: string) => Promise<SendMessageResponse>;
  setDisplayName: (name: string) => Promise<void>;
}

export function useLiveChat(roomId: string): UseLiveChatReturn {
  const [messages,     setMessages]     = useState<ChatMessageDto[]>([]);
  const [status,       setStatus]       = useState<ChatStatus>("connecting");
  const [error,        setError]        = useState<string | null>(null);
  const [guestToken,   setGuestToken]   = useState<string | null>(null);
  const [displayName,  setDisplayNameSt] = useState<string | null>(null);
  const [isNameSet,    setIsNameSet]    = useState(false);
  const [hasMore,      setHasMore]      = useState(false);
  const [cursor,       setCursor]       = useState<string | null>(null);
  const [restriction,  setRestriction]  = useState<RestrictionState | null>(null);
  const [unreadCount,  setUnreadCount]  = useState(0);
  const atBottomRef = useRef(true);

  const tokenRef          = useRef<string | null>(null);
  const sseRef            = useRef<EventSource | null>(null);
  const seenIdsRef        = useRef<Set<number>>(new Set());
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectCountRef = useRef(0);
  const unmountedRef      = useRef(false);
  const roomIdRef         = useRef(roomId);

  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);

  // ── Guest token ────────────────────────────────────────────────────────────

  const ensureToken = useCallback(async (): Promise<string> => {
    const stored = localStorage.getItem(STORAGE_KEY_TOKEN);
    if (stored) {
      tokenRef.current = stored;
      setGuestToken(stored);
      const storedName = localStorage.getItem(STORAGE_KEY_NAME);
      setDisplayNameSt(storedName);
      setIsNameSet(localStorage.getItem(STORAGE_KEY_NAME_SET) === "true");
      return stored;
    }
    const resp = await issueGuestToken();
    localStorage.setItem(STORAGE_KEY_TOKEN, resp.token);
    localStorage.setItem(STORAGE_KEY_NAME,  resp.displayName);
    // Don't set STORAGE_KEY_NAME_SET — user hasn't chosen yet
    tokenRef.current = resp.token;
    setGuestToken(resp.token);
    setDisplayNameSt(resp.displayName);
    setIsNameSet(false);
    return resp.token;
  }, []);

  const setDisplayName = useCallback(async (name: string): Promise<void> => {
    const token = tokenRef.current;
    if (!token) throw new Error("No guest token.");
    const resp = await updateChatDisplayName(token, name);
    localStorage.setItem(STORAGE_KEY_NAME, resp.displayName);
    localStorage.setItem(STORAGE_KEY_NAME_SET, "true");
    setDisplayNameSt(resp.displayName);
    setIsNameSet(true);
  }, []);

  // ── History ────────────────────────────────────────────────────────────────

  const loadHistory = useCallback(async (token: string) => {
    try {
      const resp = await getChatHistory(roomId, token);
      if (unmountedRef.current) return;
      const capped = resp.messages.slice(-MAX_MESSAGES);
      seenIdsRef.current = new Set(capped.map(m => m.id));
      setMessages(capped);
      setHasMore(resp.hasMore);
      setCursor(resp.nextCursor);
    } catch {
      if (!unmountedRef.current) setError("Could not load chat history.");
    }
  }, [roomId]);

  const loadOlder = useCallback(async () => {
    if (!cursor || !tokenRef.current) return;
    try {
      const resp = await getChatHistory(roomId, tokenRef.current, cursor);
      if (unmountedRef.current) return;
      const newMsgs = resp.messages.filter(m => !seenIdsRef.current.has(m.id));
      newMsgs.forEach(m => seenIdsRef.current.add(m.id));
      setMessages(prev => {
        const combined = [...newMsgs, ...prev];
        return combined.length > MAX_MESSAGES
          ? combined.slice(combined.length - MAX_MESSAGES)
          : combined;
      });
      setHasMore(resp.hasMore);
      setCursor(resp.nextCursor);
    } catch {
      // non-fatal
    }
  }, [roomId, cursor]);

  // ── SSE ────────────────────────────────────────────────────────────────────

  const connect = useCallback((token: string) => {
    if (sseRef.current) sseRef.current.close();

    const url = createChatSseUrl(roomId);
    const es  = new EventSource(url);
    sseRef.current = es;
    setStatus("connecting");

    es.addEventListener("connected", () => {
      if (unmountedRef.current) return;
      setStatus("connected");
      setError(null);
      reconnectCountRef.current = 0;
    });

    es.addEventListener("message", (e: MessageEvent) => {
      if (unmountedRef.current || roomIdRef.current !== roomId) return;
      try {
        const msg: ChatMessageDto = JSON.parse(e.data);
        if (seenIdsRef.current.has(msg.id)) return;
        seenIdsRef.current.add(msg.id);
        const enriched = { ...msg, isOwn: msg.isOwn || tokenRef.current === undefined };
        setMessages(prev => {
          const next = [...prev, enriched];
          return next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next;
        });
        if (!atBottomRef.current && !enriched.isOwn) {
          setUnreadCount(n => n + 1);
        }
      } catch { /* malformed SSE data */ }
    });

    es.addEventListener("message_deleted", (e: MessageEvent) => {
      if (unmountedRef.current) return;
      try {
        const { id } = JSON.parse(e.data);
        setMessages(prev => prev.filter(m => m.id !== id));
        seenIdsRef.current.delete(id);
      } catch { /* ignore */ }
    });

    es.onerror = () => {
      if (unmountedRef.current) return;
      es.close();
      sseRef.current = null;
      setStatus("reconnecting");
      reconnectCountRef.current++;
      const delay = Math.min(
        RECONNECT_BASE_MS * 2 ** (reconnectCountRef.current - 1),
        RECONNECT_MAX_MS
      );
      reconnectTimerRef.current = setTimeout(() => {
        if (!unmountedRef.current) connect(token);
      }, delay);
    };
  }, [roomId]);

  // ── Init ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    unmountedRef.current = false;
    seenIdsRef.current   = new Set();
    setMessages([]);
    setStatus("connecting");
    setError(null);
    setUnreadCount(0);

    let token: string;
    ensureToken()
      .then(t => { token = t; return loadHistory(t); })
      .then(() => { if (!unmountedRef.current) connect(token); })
      .catch(() => {
        if (!unmountedRef.current) {
          setStatus("offline");
          setError("Could not connect to chat.");
        }
      });

    return () => {
      unmountedRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
    };
  }, [roomId, ensureToken, loadHistory, connect]);

  // ── Send ───────────────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (
    text: string,
    idempotencyKey: string,
  ): Promise<SendMessageResponse> => {
    const token = tokenRef.current;
    if (!token) throw new Error("No guest token.");
    const resp = await sendChatMessage(roomId, token, text, idempotencyKey);

    // Handle moderation decisions
    if (resp.moderationDecision === "RESTRICT_USER") {
      if (resp.timeoutExpiresAt) {
        setRestriction({ type: "timeout", expiresAt: resp.timeoutExpiresAt });
      } else {
        setRestriction({ type: "ban", expiresAt: null });
      }
    }

    // Immediately add the confirmed message to local state so it appears
    // without waiting for the SSE echo. The SSE broadcast will arrive shortly
    // after — the seenIdsRef guard deduplicates it.
    if (resp.message && resp.moderationDecision !== "BLOCK" && resp.moderationDecision !== "RESTRICT_USER") {
      const msg = resp.message;
      if (!seenIdsRef.current.has(msg.id)) {
        seenIdsRef.current.add(msg.id);
        setMessages(prev => {
          const next = [...prev, { ...msg, isOwn: true }];
          return next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next;
        });
      }
    }

    return resp;
  }, [roomId]);

  const clearUnread = useCallback(() => {
    setUnreadCount(0);
    atBottomRef.current = true;
  }, []);

  const setAtBottom = useCallback((v: boolean) => {
    atBottomRef.current = v;
  }, []);

  return {
    messages, status, error, guestToken, displayName,
    isNameSet, restriction, hasMore, unreadCount,
    clearUnread, setAtBottom, loadOlder, sendMessage, setDisplayName,
  };
}
