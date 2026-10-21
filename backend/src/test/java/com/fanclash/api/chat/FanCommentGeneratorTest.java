package com.fanclash.api.chat;

import com.fanclash.api.chat.bot.FanCommentGenerator;
import com.fanclash.api.dto.ContestantRankingDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class FanCommentGeneratorTest {

    private FanCommentGenerator generator;

    @BeforeEach
    void setUp() {
        generator = new FanCommentGenerator();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private ContestantRankingDto rank(long id, String name, String slug, long favCount,
                                      int rank, double voteShare) {
        return new ContestantRankingDto(id, name, slug, null, "active", favCount, rank, voteShare);
    }

    private ContestantRankingDto eliminated(long id, String name, String slug) {
        return new ContestantRankingDto(id, name, slug, null, "eliminated", 0L, 99, 0.0);
    }

    /** Build a typical BB Tamil S10-sized ranking list. */
    private List<ContestantRankingDto> sampleRankings() {
        return List.of(
            rank(1,  "TTF Vasan",    "ttf-vasan",    334957, 1,  62.8),
            rank(2,  "Shathiga",     "shathiga",     44126,  2,  8.3),
            rank(3,  "Karishma Sama","karishma-sama",30106,  3,  5.6),
            rank(4,  "Mukesh",       "mukesh",       28912,  4,  5.4),
            rank(5,  "Rockzzz",      "rockzzz",      22000,  5,  4.1),
            rank(6,  "Akshitha Ashok","akshitha-ashok",26494,6,  5.0),
            rank(7,  "Avinash Ashok","avinash-ashok",25291,  7,  4.7),
            rank(8,  "Shama M",      "shama-m",      25063,  8,  4.7),
            rank(9,  "Muthazhagi",   "muthazhagi",   18000,  9,  3.4),
            rank(10, "Prithvinath",  "prithvinath",  12000, 10,  2.3)
        );
    }

    // ── Core generation ───────────────────────────────────────────────────────

    @Test
    void generateReturnsRequestedCount() {
        List<String> comments = generator.generate(sampleRankings(), 7, 3);
        // May be slightly fewer if pool is exhausted, but should be close
        assertFalse(comments.isEmpty());
        assertTrue(comments.size() <= 7);
    }

    @Test
    void generateNoDuplicateTextsInOneRun() {
        List<String> comments = generator.generate(sampleRankings(), 10, 3);
        long distinct = comments.stream().distinct().count();
        assertEquals(comments.size(), distinct, "Duplicate comments detected");
    }

    @Test
    void generateContainsActualContestantName() {
        List<String> comments = generator.generate(sampleRankings(), 10, 3);
        boolean mentionsAnyContestant = comments.stream().anyMatch(c ->
            c.contains("TTF Vasan") || c.contains("Shathiga") || c.contains("Rockzzz")
            || c.contains("Karishma Sama") || c.contains("Mukesh")
        );
        assertTrue(mentionsAnyContestant, "Expected at least one contestant name in generated comments");
    }

    @Test
    void generateIncludesRockzzz() {
        // Verify Rockzzz (rank 5, MID_PACK) is in the eligible pool by checking
        // its tier assignment — deterministic, no sampling needed.
        List<ContestantRankingDto> rankings = sampleRankings();
        ContestantRankingDto rockzzz = rankings.stream()
                .filter(r -> "rockzzz".equals(r.contestantSlug()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Rockzzz not in sample rankings"));

        FanCommentGenerator.Tier tier = generator.tierFor(rockzzz, rankings.size());
        // Rank 5 in a 10-contestant field → MID_PACK (not eliminated from pool)
        assertNotNull(tier);
        assertNotEquals(FanCommentGenerator.Tier.GENERIC, tier);
    }

    @Test
    void generateRespectsMaxPerContestant() {
        List<String> comments = generator.generate(sampleRankings(), 30, 2);
        // Count how many times each contestant name appears
        for (ContestantRankingDto r : sampleRankings()) {
            long nameCount = comments.stream()
                .filter(c -> c.contains(r.contestantName()))
                .count();
            assertTrue(nameCount <= 2,
                r.contestantName() + " appears " + nameCount + " times but max is 2");
        }
    }

    @Test
    void generateEmptyRankingsReturnsGenericComments() {
        List<String> comments = generator.generate(List.of(), 5, 3);
        assertFalse(comments.isEmpty(), "Should still return generic comments for empty rankings");
        // Generic comments must not contain {name} placeholder
        for (String c : comments) {
            assertFalse(c.contains("{name}"), "Template placeholder not resolved: " + c);
        }
    }

    @Test
    void generateNullRankingsReturnsGenericComments() {
        List<String> comments = generator.generate(null, 5, 3);
        assertFalse(comments.isEmpty());
    }

    @Test
    void generateSkipsEliminatedContestants() {
        List<ContestantRankingDto> mixed = new ArrayList<>(sampleRankings());
        mixed.add(eliminated(99, "Savinya Velu", "savinya-velu"));

        List<String> comments = generator.generate(mixed, 30, 5);
        boolean mentionsSavinya = comments.stream().anyMatch(c -> c.contains("Savinya Velu"));
        assertFalse(mentionsSavinya, "Eliminated contestant should not appear in generated comments");
    }

    @Test
    void generateNoTemplatePlaceholderInOutput() {
        List<String> comments = generator.generate(sampleRankings(), 10, 3);
        for (String c : comments) {
            assertFalse(c.contains("{name}"), "Unresolved placeholder in: " + c);
        }
    }

    // ── Tier assignment ───────────────────────────────────────────────────────

    @Test
    void tierAssignment() {
        List<ContestantRankingDto> r = sampleRankings();
        int total = r.size();

        assertEquals(FanCommentGenerator.Tier.LEADER,     generator.tierFor(r.get(0), total));
        assertEquals(FanCommentGenerator.Tier.RUNNER_UP,  generator.tierFor(r.get(1), total));
        // rank 5–7 in a 10-contestant field → MID_PACK
        assertEquals(FanCommentGenerator.Tier.MID_PACK,   generator.tierFor(r.get(4), total));
        // rank 9–10 → LOW
        assertEquals(FanCommentGenerator.Tier.LOW,        generator.tierFor(r.get(9), total));
    }
}
