package com.fanclash.api.chat.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Holds active SSE connections per chat room and broadcasts events.
 * Each backend instance holds its own registry; for multi-instance deployments
 * a pub/sub layer (Redis, GCP Pub/Sub) would fan out across instances.
 * Current deployment is single-instance Cloud Run — this is sufficient.
 */
@Slf4j
@Component
public class ChatSseRegistry {

    private static final long SSE_TIMEOUT_MS = 5 * 60 * 1000L; // 5 min; client reconnects automatically
    private static final int  MAX_EMITTERS_PER_ROOM = 500;

    private final Map<String, CopyOnWriteArrayList<SseEmitter>> rooms = new ConcurrentHashMap<>();

    public SseEmitter subscribe(String roomId) {
        List<SseEmitter> emitters = rooms.computeIfAbsent(roomId, k -> new CopyOnWriteArrayList<>());

        if (emitters.size() >= MAX_EMITTERS_PER_ROOM) {
            SseEmitter rejected = new SseEmitter(0L);
            try {
                rejected.send(SseEmitter.event().name("error").data("room_full"));
            } catch (IOException ignored) {}
            rejected.complete();
            return rejected;
        }

        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        emitters.add(emitter);

        Runnable remove = () -> {
            CopyOnWriteArrayList<SseEmitter> list = rooms.get(roomId);
            if (list != null) list.remove(emitter);
        };
        emitter.onCompletion(remove);
        emitter.onTimeout(remove);
        emitter.onError(e -> remove.run());

        try {
            emitter.send(SseEmitter.event().name("connected").data("{\"roomId\":\"" + roomId + "\"}"));
        } catch (IOException e) {
            remove.run();
        }

        return emitter;
    }

    public void broadcast(String roomId, String eventName, Object data) {
        CopyOnWriteArrayList<SseEmitter> emitters = rooms.get(roomId);
        if (emitters == null || emitters.isEmpty()) return;

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name(eventName).data(data));
            } catch (IOException e) {
                emitter.completeWithError(e);
            }
        }
    }

    public int connectionCount(String roomId) {
        CopyOnWriteArrayList<SseEmitter> emitters = rooms.get(roomId);
        return emitters == null ? 0 : emitters.size();
    }
}
