package com.fanclash.api.chat.dto;

import java.time.Instant;

public record ChatMessageDto(
    long id,
    String roomId,
    String displayName,
    String messageText,
    Instant createdAt,
    boolean isOwn,      // true when the requesting guest token sent this message
    boolean automated   // true for ScheduledFanChatJob-generated messages
) {}
