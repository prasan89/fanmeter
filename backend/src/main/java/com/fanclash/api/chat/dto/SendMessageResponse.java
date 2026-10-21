package com.fanclash.api.chat.dto;

import com.fanclash.api.chat.moderation.ModerationDecision;

/**
 * Returned from POST /api/chat/rooms/{roomId}/messages.
 * message is null when the message was blocked or queued for review without publishing.
 * moderationDecision is always present.
 * userMessage is a safe, human-readable explanation for BLOCK/WARN/RESTRICT decisions.
 */
public record SendMessageResponse(
        ChatMessageDto   message,
        ModerationDecision moderationDecision,
        String           userMessage,           // shown to sender; never reveals detection rules
        Long             timeoutExpiresAt       // epoch seconds; non-null when sender is timed out
) {
    public static SendMessageResponse allowed(ChatMessageDto msg) {
        return new SendMessageResponse(msg, ModerationDecision.ALLOW, null, null);
    }

    public static SendMessageResponse withWarning(ChatMessageDto msg, String userMsg) {
        return new SendMessageResponse(msg, ModerationDecision.ALLOW_WITH_WARNING, userMsg, null);
    }

    public static SendMessageResponse blocked(String userMsg) {
        return new SendMessageResponse(null, ModerationDecision.BLOCK, userMsg, null);
    }

    public static SendMessageResponse timedOut(long expiresEpochSec) {
        return new SendMessageResponse(null, ModerationDecision.RESTRICT_USER,
                "You are temporarily restricted from chat.", expiresEpochSec);
    }

    public static SendMessageResponse banned() {
        return new SendMessageResponse(null, ModerationDecision.RESTRICT_USER,
                "You are restricted from this chat. You may appeal via fanmeter.com/chat-appeal.", null);
    }
}
