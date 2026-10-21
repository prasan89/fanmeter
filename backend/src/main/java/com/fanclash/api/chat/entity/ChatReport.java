package com.fanclash.api.chat.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "chat_reports")
@Getter @Setter @NoArgsConstructor
public class ChatReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "room_id", nullable = false, length = 200)
    private String roomId;

    @Column(name = "message_id")
    private Long messageId;

    @Column(name = "reporter_token", nullable = false, length = 64)
    private String reporterToken;

    @Column(name = "reported_token", length = 64)
    private String reportedToken;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 50)
    private Category category;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false, length = 20)
    private Priority priority = Priority.NORMAL;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "reviewer", length = 64)
    private String reviewer;

    @Column(name = "outcome", length = 50)
    private String outcome;

    public enum Category {
        HARASSMENT, HATE_SPEECH, THREAT, SEXUAL_CONTENT, SPAM, PRIVATE_INFO, OTHER
    }

    public enum Priority { NORMAL, HIGH, CRITICAL }
}
