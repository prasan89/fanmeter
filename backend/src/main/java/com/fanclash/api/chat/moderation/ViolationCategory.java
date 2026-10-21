package com.fanclash.api.chat.moderation;

/** Violation category used for restriction records and moderation queue. */
public enum ViolationCategory {
    SPAM,
    HARASSMENT,
    HATE_SPEECH,
    THREAT,
    SEXUAL_CONTENT,
    SEXUAL_MINOR,   // high-severity; triggers immediate restrict + priority escalation
    DOXXING,
    PHISHING,
    OTHER
}
