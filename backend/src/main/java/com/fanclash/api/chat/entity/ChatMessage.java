package com.fanclash.api.chat.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "chat_messages")
@Getter @Setter @NoArgsConstructor
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "room_id", nullable = false, length = 200)
    private String roomId;

    @Column(name = "guest_token", nullable = false, length = 64)
    private String guestToken;

    @Column(name = "display_name", nullable = false, length = 50)
    private String displayName;

    @Column(name = "message_text", nullable = false, length = 500)
    private String messageText;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "deleted_by", length = 64)
    private String deletedBy;

    @Column(name = "idempotency_key", length = 64)
    private String idempotencyKey;

    public boolean isDeleted() {
        return deletedAt != null;
    }

    public static ChatMessage create(String roomId, String guestToken, String displayName,
                                     String messageText, String idempotencyKey) {
        ChatMessage m = new ChatMessage();
        m.roomId         = roomId;
        m.guestToken     = guestToken;
        m.displayName    = displayName;
        m.messageText    = messageText;
        m.idempotencyKey = idempotencyKey;
        return m;
    }
}
