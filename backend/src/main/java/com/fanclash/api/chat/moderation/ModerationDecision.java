package com.fanclash.api.chat.moderation;

/** Decision returned by the content moderation pipeline for a single message. */
public enum ModerationDecision {

    /** Publish the message normally. */
    ALLOW,

    /** Publish with a warning shown to the sender (minor first-time issue). */
    ALLOW_WITH_WARNING,

    /** Do not publish; show generic guideline violation message. */
    BLOCK,

    /** Hold for moderator review before or after publishing (depending on severity). */
    REVIEW,

    /**
     * Immediately restrict the user (timeout or ban) and block the message.
     * Used for credible threats, CSAM signals, or repeat serious offenders.
     */
    RESTRICT_USER
}
