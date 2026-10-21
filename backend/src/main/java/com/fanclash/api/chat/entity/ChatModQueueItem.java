package com.fanclash.api.chat.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "chat_mod_queue")
@Getter @Setter @NoArgsConstructor
public class ChatModQueueItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "message_id")
    private Long messageId;

    @Column(name = "room_id", nullable = false, length = 200)
    private String roomId;

    @Column(name = "flag_reason", nullable = false, length = 50)
    private String flagReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false, length = 20)
    private Severity severity = Severity.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private Status status = Status.PENDING;

    @Column(name = "assigned_to", length = 64)
    private String assignedTo;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "resolution", length = 50)
    private String resolution;

    @Column(name = "resolver", length = 64)
    private String resolver;

    @Column(name = "notes")
    private String notes;

    public enum Severity { LOW, MEDIUM, HIGH, CRITICAL }
    public enum Status { PENDING, ASSIGNED, RESOLVED }
}
