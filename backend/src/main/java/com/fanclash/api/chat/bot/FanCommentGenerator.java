package com.fanclash.api.chat.bot;

import com.fanclash.api.dto.ContestantRankingDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Template-based comment generator for ScheduledFanChatJob.
 *
 * Templates are keyed by ranking position tier and use {name} as the only
 * placeholder. No vote percentages or counts are embedded in text to avoid
 * stale numbers appearing in chat.
 *
 * False-positive risk is low because templates are hand-curated Tamil/English
 * fan phrases and pass the ContentModerationService without issue.
 */
@Slf4j
@Component
public class FanCommentGenerator {

    public enum Tier { LEADER, RUNNER_UP, MID_PACK, LOW, GENERIC }

    // ── Template pool ─────────────────────────────────────────────────────────

    private static final Map<Tier, List<String>> TEMPLATES = new EnumMap<>(Tier.class);

    static {
        TEMPLATES.put(Tier.LEADER, List.of(
            "{name} fans strong this week!",
            "{name} is leading — keep the support going!",
            "Huge fan base behind {name}, let's go!",
            "{name} na top ah irukaaru — vote pannunga!",
            "The gap at the top is widening, {name} fans unite!",
            "No stopping {name} this week!",
            "{name} deserves every single vote!",
            "Come on everyone, {name} fan base is incredible!",
            "{name} ki support panna maranthudutheengala? Vote now!",
            "Leader board looking good for {name}!"
        ));

        TEMPLATES.put(Tier.RUNNER_UP, List.of(
            "{name} is so close to the top — keep voting!",
            "Come on {name} fans, close the gap!",
            "{name} giving a strong fight this week.",
            "{name} rising! Neenga vote panna nallaa irukkum.",
            "Runner-up battle is heating up, {name} is right there!",
            "{name} can overtake if we push harder!",
            "Every click counts for {name}!",
            "{name} support increasing — lovely to see!",
            "Don't stop now, {name} is catching up!",
            "{name} unga support vaendum — time to act!"
        ));

        TEMPLATES.put(Tier.MID_PACK, List.of(
            "{name} in the mix — show some love!",
            "Vote for {name} and move them up!",
            "{name} fans, where are you all?",
            "Mid-table battle is tight, {name} needs votes.",
            "{name} is fighting hard inside the house!",
            "Let's push {name} higher — vote now!",
            "{name} unga support ellam kuduka ready ah?",
            "Close competition at the top, {name} can make a move!",
            "Don't overlook {name} this week!",
            "{name} deserves more support — pass it on."
        ));

        TEMPLATES.put(Tier.LOW, List.of(
            "{name} needs our support — vote and share!",
            "Come on {name} fans, let's make some noise!",
            "Every vote matters for {name} — don't give up!",
            "{name} is working hard, let's reward that.",
            "Time to rally for {name}!",
            "{name} fans — share the poll link with friends!",
            "Underdog story? {name} can turn this around.",
            "{name} poraduvaarunga — we vote panna venum.",
            "Support for {name} can change everything this week.",
            "{name} is still in this — keep the faith!"
        ));

        TEMPLATES.put(Tier.GENERIC, List.of(
            "Who do you think will move up in the next update?",
            "What a week inside the Bigg Boss house!",
            "The rankings are shifting — stay tuned!",
            "Every vote makes a difference — have you voted today?",
            "Interesting competition this week!",
            "Share the poll with your friends and family!",
            "Live rankings update coming soon — check back!",
            "Fan energy this week has been incredible!",
            "Who is your favourite to win the whole season?",
            "Let's keep the conversation going — comment below!"
        ));
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Generates a set of unique comment texts for the given ranked contestant list.
     *
     * @param rankings   current rankings, sorted by favouriteCount descending (rank 1 first)
     * @param count      number of distinct comments to produce
     * @param maxPerContestant cap on how many comments can reference one contestant per run
     * @return list of generated comment strings (may be shorter than count if pool exhausted)
     */
    public List<String> generate(List<ContestantRankingDto> rankings, int count, int maxPerContestant) {
        if (rankings == null || rankings.isEmpty()) {
            log.info("No rankings available — generating generic comments only");
            return generateGeneric(count);
        }

        List<ContestantRankingDto> active = rankings.stream()
                .filter(r -> !"eliminated".equalsIgnoreCase(r.status()))
                .toList();

        if (active.isEmpty()) {
            return generateGeneric(count);
        }

        List<String> results    = new ArrayList<>(count);
        Set<String>  seen       = new HashSet<>();
        Map<Long, Integer> used = new HashMap<>();
        Random rng              = new Random();

        // Build a weighted candidate list: more slots for interesting positions
        List<ContestantRankingDto> candidates = new ArrayList<>();
        for (ContestantRankingDto r : active) {
            Tier tier = tierFor(r, active.size());
            int weight = switch (tier) {
                case LEADER    -> 3;
                case RUNNER_UP -> 3;
                case MID_PACK  -> 2;
                case LOW       -> 1;
                default        -> 0;
            };
            for (int i = 0; i < weight; i++) candidates.add(r);
        }
        Collections.shuffle(candidates, rng);

        // Contestant-keyed generation
        int attempts = 0;
        int maxAttempts = count * 10;
        while (results.size() < count && attempts++ < maxAttempts) {
            if (candidates.isEmpty() || rng.nextInt(5) == 0) {
                // ~20% generic comments
                String text = pickUnused(TEMPLATES.get(Tier.GENERIC), seen, rng);
                if (text != null) { results.add(text); seen.add(text); }
                continue;
            }

            ContestantRankingDto r = candidates.get(rng.nextInt(candidates.size()));
            int usedCount = used.getOrDefault(r.contestantId(), 0);
            if (usedCount >= maxPerContestant) continue;

            Tier tier = tierFor(r, active.size());
            List<String> pool = TEMPLATES.get(tier);
            String template = pickUnused(pool, seen, rng);
            if (template == null) continue;

            String text = template.replace("{name}", r.contestantName());
            if (seen.contains(text)) continue;

            results.add(text);
            seen.add(text);
            used.merge(r.contestantId(), 1, Integer::sum);
        }

        log.debug("Generated {} comments from {} active contestants", results.size(), active.size());
        return results;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public Tier tierFor(ContestantRankingDto r, int totalActive) {
        int rank = r.rank();
        if (rank == 1) return Tier.LEADER;
        if (rank <= Math.max(2, totalActive / 5)) return Tier.RUNNER_UP;
        if (rank <= Math.max(3, totalActive / 2)) return Tier.MID_PACK;
        return Tier.LOW;
    }

    private List<String> generateGeneric(int count) {
        Random rng = new Random();
        List<String> pool = new ArrayList<>(TEMPLATES.get(Tier.GENERIC));
        Collections.shuffle(pool, rng);
        return pool.subList(0, Math.min(count, pool.size()));
    }

    private String pickUnused(List<String> pool, Set<String> seen, Random rng) {
        List<String> available = pool.stream().filter(t -> !seen.contains(t)).toList();
        if (available.isEmpty()) return null;
        return available.get(rng.nextInt(available.size()));
    }
}
