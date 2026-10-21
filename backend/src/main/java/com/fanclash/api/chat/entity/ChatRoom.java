package com.fanclash.api.chat.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "chat_rooms")
@Getter @Setter @NoArgsConstructor
public class ChatRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "room_id", nullable = false, unique = true, length = 200)
    private String roomId;

    @Column(name = "season_id")
    private Long seasonId;

    @Column(name = "event_slug", nullable = false, length = 200)
    private String eventSlug;

    @Column(name = "slow_mode_seconds", nullable = false)
    private int slowModeSeconds = 0;

    @Column(name = "is_paused", nullable = false)
    private boolean paused = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public static ChatRoom create(String roomId, String eventSlug, Long seasonId) {
        ChatRoom r = new ChatRoom();
        r.roomId    = roomId;
        r.eventSlug = eventSlug;
        r.seasonId  = seasonId;
        return r;
    }
}
