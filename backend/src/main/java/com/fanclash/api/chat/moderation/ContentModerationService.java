package com.fanclash.api.chat.moderation;

import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Deterministic rule-based content moderation service.
 *
 * Pipeline per message:
 *   1. Normalize (NFC, lowercase, strip diacritics, map common obfuscations)
 *   2. Run CRITICAL rules (CSAM signals, credible imminent threats) → RESTRICT_USER immediately
 *   3. Run HIGH rules (serious threats, targeted harassment) → RESTRICT_USER / REVIEW
 *   4. Run MEDIUM rules (hate speech, doxxing, sexual content) → BLOCK
 *   5. Run LOW rules (spam, mild profanity) → ALLOW_WITH_WARNING or BLOCK
 *   6. ALLOW if nothing matched
 *
 * Rules use pre-compiled patterns for performance. All pattern matches are performed on
 * the normalized text; original text is stored in the message but not in moderation logs.
 *
 * Supported languages: English, Tamil, Tanglish (Tamil written in Latin script), Unicode.
 */
@Service
public class ContentModerationService {

    // ── Obfuscation normalization map ─────────────────────────────────────────
    // Common substitutions used to bypass keyword filters
    private static final String[][] OBFUSCATION_MAP = {
        {"0", "o"}, {"1", "i"}, {"1", "l"}, {"3", "e"}, {"4", "a"},
        {"5", "s"}, {"6", "g"}, {"7", "t"}, {"8", "b"}, {"9", "g"},
        {"@", "a"}, {"$", "s"}, {"!", "i"}, {"|", "i"}, {"+", "t"},
        {"(", "c"}, {"vv", "w"}, {"ph", "f"},
    };

    // ── Doxxing patterns ─────────────────────────────────────────────────────
    // Phone numbers, addresses, email patterns in message context
    private static final Pattern PHONE_PATTERN = Pattern.compile(
        "(?:\\+?\\d[\\s\\-.]?){8,14}\\d",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern EMAIL_PATTERN = Pattern.compile(
        "[a-z0-9._%+\\-]+@[a-z0-9.\\-]+\\.[a-z]{2,}",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern PASSWORD_PATTERN = Pattern.compile(
        "(?:password|passwd|pwd|pass)[\\s:=]+\\S+",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern ADDRESS_PATTERN = Pattern.compile(
        "\\b(?:no\\.?\\s*\\d+|\\d+[,\\s]+(?:[a-z]+\\s+){1,4}(?:street|road|nagar|salai|layout|colony|flat|apt|apartment))",
        Pattern.CASE_INSENSITIVE
    );

    // ── URL / phishing patterns ───────────────────────────────────────────────
    private static final Pattern URL_PATTERN = Pattern.compile(
        "(?:https?://|www\\.)[^\\s]{4,}|bit\\.ly/\\S+|tinyurl\\.com/\\S+",
        Pattern.CASE_INSENSITIVE
    );

    // ── CRITICAL: CSAM signals ────────────────────────────────────────────────
    // These patterns must trigger RESTRICT_USER + high-severity immediately.
    // Kept deliberately broad to fail closed. Expect some false positives — moderation
    // queue review is the safety net.
    private static final List<Pattern> CSAM_PATTERNS = compile(
        "\\bchild\\s*(sex|nude|naked|porn)\\b",
        "\\bkid\\s*(nude|porn|sex)\\b",
        "\\bminor\\s*(nude|porn|sex)\\b",
        "\\bcp\\s*(?:link|share|send)\\b",
        "\\bunderage\\s*(sex|nude|porn)\\b"
    );

    // ── CRITICAL: Credible imminent threats ───────────────────────────────────
    private static final List<Pattern> IMMINENT_THREAT_PATTERNS = compile(
        "(?:i(?:'ll| will|'m going to|am going to))\\s+(?:kill|murder|shoot|stab|bomb|attack)\\s+(?:you|him|her|them|u)",
        "(?:kill|murder)\\s+(?:you|him|her|u)\\b",
        "(?:your|ur)\\s+(?:address|house|home|location)\\s+(?:i know|known|found)",
        "(?:bomb|explosion)\\s+(?:threat|warning|planted)",
        // Tamil transliterations
        "(?:unna|unnai)\\s+(?:kill|murder|kollu)",
        "kolli\\s*viduven",
        "thookku\\s*poduven"
    );

    // ── HIGH: Serious threats ─────────────────────────────────────────────────
    private static final List<Pattern> SERIOUS_THREAT_PATTERNS = compile(
        "\\b(?:die|death)\\s+(?:to|for)\\s+\\S+",
        "\\b(?:hurt|harm|destroy|ruin)\\s+(?:you|him|her|them|u|ur)\\b",
        "\\b(?:r[a4]pe|sexually assault)\\s+(?:you|him|her|u)\\b",
        "send\\s+(?:your|ur)\\s+(?:location|address)",
        "(?:come|find)\\s+(?:to|at)\\s+(?:your|ur)\\s+(?:house|home|school|work)",
        // Tamil
        "adikka\\s*varuven",
        "poda\\s+(?:thayoli|loosu)"
    );

    // ── MEDIUM: Hate speech / slurs ───────────────────────────────────────────
    // Pattern list uses normalized text (no diacritics, leet substitutions already reversed)
    private static final List<Pattern> HATE_PATTERNS = compile(
        // English slurs — using normalized spelling (diacritics removed, leet reversed)
        "\\bn[i1][g9][g9][e3]r\\b",
        "\\bf[a4][g9][g9](?:[o0]t)?\\b",
        "\\bc[hu][i1]nk\\b",
        "\\bsp[i1][c]{1,2}\\b",
        "\\bk[i1]ke\\b",
        "\\btr[a4]nny\\b",
        "\\bsl[u4]t\\b",
        "\\bwh[o0]re\\b",
        "\\bc[uo]nt\\b",
        // Tamil / Tanglish slurs (normalized)
        "\\b(?:thevidiya|thevudiya)\\b",
        "\\bpunda(?:chi|yi)?\\b",
        "\\bpaiyan\\s+(?:da|di)\\b",
        "\\bkootha(?:di)?\\b"
    );

    // ── MEDIUM: Sexual content ────────────────────────────────────────────────
    private static final List<Pattern> SEXUAL_PATTERNS = compile(
        "\\b(?:fuck|fcuk|fck)\\s+(?:me|you|him|her|u)\\b",
        "\\b(?:suck|lick)\\s+(?:my|ur|your)\\s+(?:dick|cock|pussy|ass)\\b",
        "\\b(?:sex|sexting|nude|nudes)\\s+(?:share|send|swap|trade)\\b",
        "\\bwant\\s+(?:to\\s+)?(?:sex|f.ck|screw)\\s+(?:you|u|her|him)\\b",
        // Tamil
        "\\boodhu\\b",
        "\\bkoothi\\b"
    );

    // ── LOW: Spam / flooding ──────────────────────────────────────────────────
    // Same word 4+ times or same 2-char chunk repeated 6+ times
    private static final Pattern WORD_FLOOD_PATTERN = Pattern.compile(
        "\\b(\\w{2,})(?:\\s+\\1){3,}\\b",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern CHAR_FLOOD_PATTERN = Pattern.compile(
        "(.)\\1{9,}"  // same char 10+ times
    );
    private static final Pattern CAPS_FLOOD_PATTERN = Pattern.compile(
        "[A-Z]{20,}"  // 20+ consecutive capitals
    );

    // ── LOW: Mild profanity (warn, don't block) ───────────────────────────────
    private static final List<Pattern> MILD_PROFANITY_PATTERNS = compile(
        "\\bsh[i1]t\\b",
        "\\bd[a4]mn\\b",
        "\\b[a4]ss(?:hole)?\\b",
        "\\bb[i1]tch\\b",
        "\\bf.ck\\b",
        // Tamil mild
        "\\bpoda\\b",
        "\\bthayoli\\b"
    );

    // ── Repeated-submission detector (same normalized text ≥3 chars) ──────────
    // Handled in ChatRateLimiter; not checked here.

    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Evaluate a single message text.
     * @param rawText original message (must already be stripped of null bytes)
     * @return ModerationResult — the caller must act on the decision
     */
    public ModerationResult evaluate(String rawText) {
        String normalized = normalize(rawText);

        // 1. CRITICAL: CSAM
        for (Pattern p : CSAM_PATTERNS) {
            if (p.matcher(normalized).find()) {
                return ModerationResult.restrictUser(ViolationCategory.SEXUAL_MINOR, p.pattern(), true);
            }
        }

        // 2. CRITICAL: Imminent threats
        for (Pattern p : IMMINENT_THREAT_PATTERNS) {
            if (p.matcher(normalized).find()) {
                return ModerationResult.restrictUser(ViolationCategory.THREAT, p.pattern(), true);
            }
        }

        // 3. CRITICAL: Doxxing — phone, address, password in same message
        if (PHONE_PATTERN.matcher(rawText).find()) {
            return ModerationResult.block(ViolationCategory.DOXXING, "phone_number");
        }
        if (PASSWORD_PATTERN.matcher(normalized).find()) {
            return ModerationResult.block(ViolationCategory.DOXXING, "password_share");
        }
        if (ADDRESS_PATTERN.matcher(normalized).find()) {
            return ModerationResult.review(ViolationCategory.DOXXING, "possible_address");
        }

        // 4. HIGH: Serious threats
        for (Pattern p : SERIOUS_THREAT_PATTERNS) {
            if (p.matcher(normalized).find()) {
                return ModerationResult.restrictUser(ViolationCategory.THREAT, p.pattern(), false);
            }
        }

        // 5. MEDIUM: Hate speech
        for (Pattern p : HATE_PATTERNS) {
            if (p.matcher(normalized).find()) {
                return ModerationResult.block(ViolationCategory.HATE_SPEECH, p.pattern());
            }
        }

        // 6. MEDIUM: Sexual content
        for (Pattern p : SEXUAL_PATTERNS) {
            if (p.matcher(normalized).find()) {
                return ModerationResult.block(ViolationCategory.SEXUAL_CONTENT, p.pattern());
            }
        }

        // 7. MEDIUM: Email / phishing URLs
        if (EMAIL_PATTERN.matcher(rawText).find()) {
            return ModerationResult.review(ViolationCategory.DOXXING, "email_address");
        }
        if (URL_PATTERN.matcher(rawText).find()) {
            return ModerationResult.review(ViolationCategory.PHISHING, "url_detected");
        }

        // 8. LOW: Spam patterns
        if (WORD_FLOOD_PATTERN.matcher(normalized).find()) {
            return ModerationResult.allowWithWarning(ViolationCategory.SPAM, "word_flood");
        }
        if (CHAR_FLOOD_PATTERN.matcher(normalized).find()) {
            return ModerationResult.allowWithWarning(ViolationCategory.SPAM, "char_flood");
        }
        if (CAPS_FLOOD_PATTERN.matcher(rawText).find()) {
            return ModerationResult.allowWithWarning(ViolationCategory.SPAM, "caps_flood");
        }

        // 9. LOW: Mild profanity — warn once, don't block
        for (Pattern p : MILD_PROFANITY_PATTERNS) {
            if (p.matcher(normalized).find()) {
                return ModerationResult.allowWithWarning(ViolationCategory.OTHER, "mild_profanity");
            }
        }

        return ModerationResult.allow();
    }

    /**
     * Normalize text for matching: NFC → lowercase → strip diacritics → reverse common obfuscations.
     * The original text is NOT modified; this normalized copy is used only for pattern matching.
     */
    public String normalize(String text) {
        // NFC normalization, then decompose and strip combining characters (diacritics)
        String nfc  = Normalizer.normalize(text, Normalizer.Form.NFC);
        String nfd  = Normalizer.normalize(nfc, Normalizer.Form.NFD);
        String noAccents = nfd.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        String lower = noAccents.toLowerCase();

        // Collapse repeated special characters used to space out slurs (e.g. "n-i-g-g-e-r")
        String dehyphen = lower.replaceAll("(?<=\\w)[\\-_.\\*]{1,3}(?=\\w)", "");

        // Reverse leet-speak / common substitutions
        StringBuilder sb = new StringBuilder(dehyphen);
        for (String[] entry : OBFUSCATION_MAP) {
            String from = entry[0];
            String to   = entry[1];
            int idx;
            // Only replace if result doesn't create false new matches; simple replace is good enough
            // for the obfuscation reversals we target
            while ((idx = sb.indexOf(from)) >= 0) {
                sb.replace(idx, idx + from.length(), to);
            }
        }

        // Collapse repeated spaces
        return sb.toString().replaceAll("\\s{2,}", " ").strip();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static List<Pattern> compile(String... regexes) {
        Pattern[] patterns = new Pattern[regexes.length];
        for (int i = 0; i < regexes.length; i++) {
            patterns[i] = Pattern.compile(regexes[i], Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
        }
        return List.of(patterns);
    }
}
