package com.fanclash.api.chat.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "chat_moderation_log")
@Getter @Setter @NoArgsConstructor
public class ChatModerationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "room_id", length = 200)
    private String roomId;

    @Column(name = "target_token", length = 64)
    private String targetToken;

    @Column(name = "action", nullable = false, length = 50)
    private String action;

    @Column(name = "message_id")
    private Long messageId;

    @Column(name = "moderator", nullable = false, length = 64)
    private String moderator;

    @Column(name = "reason")
    private String reason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
