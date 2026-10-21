package com.fanclash.api.chat.dto;

import java.util.List;

public record ChatHistoryResponse(
    String roomId,
    List<ChatMessageDto> messages,
    boolean hasMore,
    String nextCursor   // ISO instant of oldest message returned, for pagination
) {}
