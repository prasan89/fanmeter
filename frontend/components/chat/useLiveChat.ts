"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { ChatMessageDto } from "@/types";
import { issueGuestToken, getChatHistory, sendChatMessage, createChatSseUrl } from "@/lib/api";

const STORAGE_KEY_TOKEN   = "fanmeter_chat_token";
const STORAGE_KEY_NAME    = "fanmeter_chat_name";
const MAX_MESSAGES        = 200;
const RECONNECT_BASE_MS   = 2_000;
const RECONNECT_MAX_MS    = 30_000;

export type ChatStatus = "connecting" | "connected" | "reconnecting" | "offline";

export interface UseLiveChatReturn {
  messages:     ChatMessageDto[];
  status:       ChatStatus;
  error:        string | null;
  guestToken:   string | null;
  displayName:  string | null;
  hasMore:      boolean;
  loadOlder:    () => Promise<void>;
  sendMessage:  (text: string, idempotencyKey: string) => Promise<void>;
}

export function useLiveChat(roomId: string): UseLiveChatReturn {
  const [messages,    setMessages]    = useState<ChatMessageDto[]>([]);
  const [status,      setStatus]      = useState<ChatStatus>("connecting");
  const [error,       setError]       = useState<string | null>(null);
  const [guestToken,  setGuestToken]  = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [hasMore,     setHasMore]     = useState(false);
  const [cursor,      setCursor]      = useState<string | null>(null);

  const tokenRef         = useRef<string | null>(null);
  const sseRef           = useRef<EventSource | null>(null);
  const seenIdsRef       = useRef<Set<number>>(new Set());
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectCountRef = useRef(0);
  const unmountedRef     = useRef(false);
  const roomIdRef        = useRef(roomId);

  // Keep roomId ref current so SSE callbacks use the latest value
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);

  // ── Guest token ────────────────────────────────────────────────────────────

  const ensureToken = useCallback(async (): Promise<string> => {
    const stored = localStorage.getItem(STORAGE_KEY_TOKEN);
    if (stored) {
      tokenRef.current = stored;
      setGuestToken(stored);
      setDisplayName(localStorage.getItem(STORAGE_KEY_NAME));
      return stored;
    }
    const resp = await issueGuestToken();
    localStorage.setItem(STORAGE_KEY_TOKEN, resp.token);
    localStorage.setItem(STORAGE_KEY_NAME,  resp.displayName);
    tokenRef.current = resp.token;
    setGuestToken(resp.token);
    setDisplayName(resp.displayName);
    return resp.token;
  }, []);

  // ── History ────────────────────────────────────────────────────────────────

  const loadHistory = useCallback(async (token: string) => {
    try {
      const resp = await getChatHistory(roomId, token);
      if (unmountedRef.current) return;
      seenIdsRef.current = new Set(resp.messages.map(m => m.id));
      setMessages(resp.messages);
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
      setMessages(prev => [...newMsgs, ...prev].slice(0, MAX_MESSAGES));
      setHasMore(resp.hasMore);
      setCursor(resp.nextCursor);
    } catch {
      // non-fatal
    }
  }, [roomId, cursor]);

  // ── SSE ────────────────────────────────────────────────────────────────────

  const connect = useCallback((token: string) => {
    if (sseRef.current) {
      sseRef.current.close();
    }

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
        // Mark own messages
        const enriched = { ...msg, isOwn: msg.isOwn || tokenRef.current === undefined };
        setMessages(prev => {
          const next = [...prev, enriched];
          return next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next;
        });
      } catch {
        // malformed SSE data — skip
      }
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

    let token: string;
    ensureToken()
      .then(t => {
        token = t;
        return loadHistory(t);
      })
      .then(() => {
        if (!unmountedRef.current) connect(token);
      })
      .catch(() => {
        if (!unmountedRef.current) {
          setStatus("offline");
          setError("Could not connect to chat.");
        }
      });

    return () => {
      unmountedRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    };
  }, [roomId, ensureToken, loadHistory, connect]);

  // ── Send ───────────────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (text: string, idempotencyKey: string) => {
    const token = tokenRef.current;
    if (!token) throw new Error("No guest token.");
    await sendChatMessage(roomId, token, text, idempotencyKey);
  }, [roomId]);

  return { messages, status, error, guestToken, displayName, hasMore, loadOlder, sendMessage };
}
