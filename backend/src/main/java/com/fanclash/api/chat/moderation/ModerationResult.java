package com.fanclash.api.chat.moderation;

/**
 * Result of running the content moderation pipeline on a single message.
 * The matched rule name is retained for audit purposes only — never sent to the client.
 */
public record ModerationResult(
        ModerationDecision decision,
        ViolationCategory  category,
        String             matchedRule,    // internal audit only
        boolean            highSeverity    // true → immediate escalation
) {
    public static ModerationResult allow() {
        return new ModerationResult(ModerationDecision.ALLOW, null, null, false);
    }

    public static ModerationResult allowWithWarning(ViolationCategory cat, String rule) {
        return new ModerationResult(ModerationDecision.ALLOW_WITH_WARNING, cat, rule, false);
    }

    public static ModerationResult block(ViolationCategory cat, String rule) {
        return new ModerationResult(ModerationDecision.BLOCK, cat, rule, false);
    }

    public static ModerationResult review(ViolationCategory cat, String rule) {
        return new ModerationResult(ModerationDecision.REVIEW, cat, rule, false);
    }

    public static ModerationResult restrictUser(ViolationCategory cat, String rule, boolean highSeverity) {
        return new ModerationResult(ModerationDecision.RESTRICT_USER, cat, rule, highSeverity);
    }
}
