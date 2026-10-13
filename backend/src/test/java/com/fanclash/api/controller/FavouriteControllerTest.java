package com.fanclash.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FavouriteControllerTest {

    @Autowired MockMvc      mockMvc;
    @Autowired ObjectMapper mapper;
    @Autowired JdbcTemplate jdbc;

    private long tamilSeasonId;
    private long teluguSeasonId;
    private long tamilContestantId;
    private long teluguContestantId;

    @BeforeEach
    void setup() {
        jdbc.execute("DELETE FROM contestant_favourite_counts");
        jdbc.execute("DELETE FROM contestant_favourites");
        tamilSeasonId  = jdbc.queryForObject(
            "SELECT s.id FROM seasons s JOIN shows sh ON sh.id = s.show_id " +
            "WHERE sh.slug = 'bigg-boss-tamil' AND s.season_number = 10", Long.class);
        teluguSeasonId = jdbc.queryForObject(
            "SELECT s.id FROM seasons s JOIN shows sh ON sh.id = s.show_id " +
            "WHERE sh.slug = 'bigg-boss-telugu' AND s.season_number = 10", Long.class);
        tamilContestantId  = jdbc.queryForObject(
            "SELECT id FROM contestants WHERE slug = 'avinash-ashok'", Long.class);
        teluguContestantId = jdbc.queryForObject(
            "SELECT id FROM contestants WHERE slug = 'debjani-modak'", Long.class);
        // Re-seed count rows (mirroring V11) so atomicIncrement UPDATE always finds an existing row
        jdbc.execute(
            "INSERT INTO contestant_favourite_counts (season_id, contestant_id, total, updated_at) " +
            "SELECT season_id, id, 0, CURRENT_TIMESTAMP FROM contestants " +
            "WHERE NOT EXISTS (" +
            "  SELECT 1 FROM contestant_favourite_counts cfc " +
            "  WHERE cfc.season_id = contestants.season_id AND cfc.contestant_id = contestants.id)");
    }

    // ── Rankings ──────────────────────────────────────────────────────────────

    @Test
    void rankingsReturnsContestants() throws Exception {
        mockMvc.perform(get("/api/seasons/{id}/rankings", tamilSeasonId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.rankings", hasSize(greaterThan(0))))
            .andExpect(jsonPath("$.data.seasonId").value(tamilSeasonId));
    }

    @Test
    void rankingsOrderedByFavouriteCountDesc() throws Exception {
        addFavourite(tamilSeasonId, tamilContestantId, "fmk_rank_v1xxxxx", uuid());
        addFavourite(tamilSeasonId, tamilContestantId, "fmk_rank_v2xxxxx", uuid());

        mockMvc.perform(get("/api/seasons/{id}/rankings", tamilSeasonId))
            .andExpect(jsonPath("$.data.rankings[0].contestantId").value(tamilContestantId))
            .andExpect(jsonPath("$.data.rankings[0].favouriteCount").value(2));
    }

    @Test
    void rankingsForUnknownSeasonReturns404() throws Exception {
        mockMvc.perform(get("/api/seasons/99999/rankings"))
            .andExpect(status().isNotFound());
    }

    // ── Add favourite ─────────────────────────────────────────────────────────

    @Test
    void singleClickAddsOne() throws Exception {
        mockMvc.perform(post("/api/seasons/{id}/favourites", tamilSeasonId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(tamilContestantId, "fmk_single_xxxxx", uuid())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.success").value(true))
            .andExpect(jsonPath("$.data.duplicate").value(false))
            .andExpect(jsonPath("$.data.newFavouriteCount").value(1));
    }

    @Test
    void twoDistinctClicksAddTwo() throws Exception {
        addFavourite(tamilSeasonId, tamilContestantId, "fmk_click1_xxxxx", uuid());

        mockMvc.perform(post("/api/seasons/{id}/favourites", tamilSeasonId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(tamilContestantId, "fmk_click2_xxxxx", uuid())))
            .andExpect(jsonPath("$.data.newFavouriteCount").value(2));
    }

    @Test
    void sameIdempotencyKeyIsIdempotent() throws Exception {
        String key = uuid();
        // First submit
        addFavourite(tamilSeasonId, tamilContestantId, "fmk_idem1_xxxxxx", key);

        // Retry same key
        mockMvc.perform(post("/api/seasons/{id}/favourites", tamilSeasonId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(tamilContestantId, "fmk_idem1_xxxxxx", key)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.duplicate").value(true))
            .andExpect(jsonPath("$.data.newFavouriteCount").value(1)); // still 1, not 2

        // DB must have exactly 1 row for this key
        Long rows = jdbc.queryForObject(
            "SELECT COUNT(*) FROM contestant_favourites WHERE idempotency_key = ?",
            Long.class, key);
        assertThat(rows).isEqualTo(1L);
    }

    @Test
    void repeatedClicksFromSameBrowserAllCount() throws Exception {
        String voterKey = "fmk_repeat_xxxxxxxx";
        for (int i = 0; i < 5; i++) {
            addFavourite(tamilSeasonId, tamilContestantId, voterKey, uuid());
        }
        Long rows = jdbc.queryForObject(
            "SELECT COUNT(*) FROM contestant_favourites " +
            "WHERE contestant_id = ? AND voter_key = ?",
            Long.class, tamilContestantId, voterKey);
        assertThat(rows).isEqualTo(5L);

        mockMvc.perform(get("/api/seasons/{id}/rankings", tamilSeasonId))
            .andExpect(jsonPath("$.data.rankings[0].favouriteCount").value(5));
    }

    @Test
    void invalidVoterKeyReturns400() throws Exception {
        mockMvc.perform(post("/api/seasons/{id}/favourites", tamilSeasonId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(tamilContestantId, "short", uuid())))
            .andExpect(status().isBadRequest());
    }

    @Test
    void wrongSeasonContestantRejected() throws Exception {
        mockMvc.perform(post("/api/seasons/{id}/favourites", tamilSeasonId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(teluguContestantId, "fmk_wrong_xxxxxxx", uuid())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(false));
    }

    // ── Event isolation ───────────────────────────────────────────────────────

    @Test
    void tamilAndTeluguCountsAreIsolated() throws Exception {
        addFavourite(tamilSeasonId,  tamilContestantId,  "fmk_iso_tamil", uuid());
        addFavourite(tamilSeasonId,  tamilContestantId,  "fmk_iso_tamil2", uuid());
        addFavourite(teluguSeasonId, teluguContestantId, "fmk_iso_tel",   uuid());

        // Tamil: 2
        mockMvc.perform(get("/api/seasons/{id}/rankings", tamilSeasonId))
            .andExpect(jsonPath("$.data.rankings[0].contestantId").value(tamilContestantId))
            .andExpect(jsonPath("$.data.rankings[0].favouriteCount").value(2));

        // Telugu: 1
        mockMvc.perform(get("/api/seasons/{id}/rankings", teluguSeasonId))
            .andExpect(jsonPath("$.data.rankings[0].contestantId").value(teluguContestantId))
            .andExpect(jsonPath("$.data.rankings[0].favouriteCount").value(1));
    }

    // ── 20 concurrent requests → 20 accepted increments (reduced N for MockMvc speed) ──

    @Test
    @Tag("slow")
    void concurrentClicksProduceExactIncrements() throws Exception {
        int N = 20;  // 20 concurrent unique clicks; each must produce exactly 1 DB row + counter increment
        ExecutorService pool  = Executors.newFixedThreadPool(20);
        CountDownLatch ready  = new CountDownLatch(N);
        CountDownLatch go     = new CountDownLatch(1);
        AtomicInteger success = new AtomicInteger(0);

        for (int i = 0; i < N; i++) {
            final String iKey = uuid();
            pool.submit(() -> {
                try {
                    ready.countDown();
                    go.await();
                    var result = mockMvc.perform(post("/api/seasons/{id}/favourites", tamilSeasonId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body(tamilContestantId, "fmk_conc_xxxxxxx", iKey)))
                        .andReturn();
                    if (result.getResponse().getStatus() == 200
                            && result.getResponse().getContentAsString().contains("\"duplicate\":false")) {
                        success.incrementAndGet();
                    }
                } catch (Exception ignored) {}
            });
        }
        ready.await();
        go.countDown();
        pool.shutdown();
        pool.awaitTermination(30, TimeUnit.SECONDS);

        // Every unique idempotency key must have produced exactly 1 row
        Long dbRows = jdbc.queryForObject(
            "SELECT COUNT(*) FROM contestant_favourites WHERE contestant_id = ?",
            Long.class, tamilContestantId);
        assertThat(dbRows).isEqualTo((long) N);
        assertThat(success.get()).isEqualTo(N);

        // Aggregate counter must equal N
        Long total = jdbc.queryForObject(
            "SELECT total FROM contestant_favourite_counts " +
            "WHERE season_id = ? AND contestant_id = ?",
            Long.class, tamilSeasonId, tamilContestantId);
        assertThat(total).isEqualTo((long) N);
    }

    // ── Rankings reorder after increments ─────────────────────────────────────

    @Test
    void rankingsReorderWhenCountChanges() throws Exception {
        long otherContestantId = jdbc.queryForObject(
            "SELECT id FROM contestants WHERE season_id = ? AND slug != 'avinash-ashok' " +
            "AND status = 'active' LIMIT 1", Long.class, tamilSeasonId);

        // Give other contestant a head start
        addFavourite(tamilSeasonId, otherContestantId, "fmk_reorder_1", uuid());

        mockMvc.perform(get("/api/seasons/{id}/rankings", tamilSeasonId))
            .andExpect(jsonPath("$.data.rankings[0].contestantId").value(otherContestantId));

        // Give tamilContestantId 2 hearts → should now lead
        addFavourite(tamilSeasonId, tamilContestantId, "fmk_reorder_2", uuid());
        addFavourite(tamilSeasonId, tamilContestantId, "fmk_reorder_3", uuid());

        mockMvc.perform(get("/api/seasons/{id}/rankings", tamilSeasonId))
            .andExpect(jsonPath("$.data.rankings[0].contestantId").value(tamilContestantId))
            .andExpect(jsonPath("$.data.rankings[0].favouriteCount").value(2));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String uuid() { return UUID.randomUUID().toString().replace("-", ""); }

    private String body(long contestantId, String voterKey, String iKey) throws Exception {
        return mapper.writeValueAsString(Map.of(
            "contestantId",   contestantId,
            "voterKey",       voterKey,
            "idempotencyKey", iKey));
    }

    private void addFavourite(long seasonId, long contestantId,
                               String voterKey, String iKey) throws Exception {
        mockMvc.perform(post("/api/seasons/{id}/favourites", seasonId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(contestantId, voterKey, iKey)))
            .andExpect(status().isOk());
    }

    // ── Filtering + voteShare tests ───────────────────────────────────────────

    @Test
    void eliminatedContestantNeverAppearsInRankings() throws Exception {
        // 'anandhi-ajay' is eliminated in the seed data
        Long eliminatedId = jdbc.queryForObject(
            "SELECT id FROM contestants WHERE slug = 'anandhi-ajay'", Long.class);

        var result = mockMvc.perform(get("/api/seasons/{id}/rankings", tamilSeasonId))
            .andExpect(status().isOk())
            .andReturn();

        String body = result.getResponse().getContentAsString();
        assertThat(body).doesNotContain("anandhi-ajay");
        assertThat(body).doesNotContain("\"eliminated\"");
        assertThat(body).doesNotContain("\"contestantId\":" + eliminatedId);
    }

    @Test
    void activeRanksAreContiguous() throws Exception {
        var result = mockMvc.perform(get("/api/seasons/{id}/rankings", tamilSeasonId))
            .andExpect(status().isOk())
            .andReturn();

        String body = result.getResponse().getContentAsString();
        com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(body);
        com.fasterxml.jackson.databind.JsonNode rankings = root.path("data").path("rankings");

        int size = rankings.size();
        assertThat(size).isGreaterThan(0);
        java.util.List<Integer> ranks = new java.util.ArrayList<>();
        rankings.forEach(node -> ranks.add(node.path("rank").asInt()));
        java.util.Collections.sort(ranks);
        for (int i = 0; i < size; i++) {
            assertThat(ranks.get(i)).isEqualTo(i + 1);
        }
    }

    @Test
    void voteSharePercentagesCorrect() throws Exception {
        // Give tamilContestant 2 votes, find a second active contestant and give 1 vote
        Long secondId = jdbc.queryForObject(
            "SELECT id FROM contestants WHERE season_id = ? AND slug != 'avinash-ashok' " +
            "AND status = 'active' LIMIT 1", Long.class, tamilSeasonId);

        addFavourite(tamilSeasonId, tamilContestantId, "fmk_share1a", uuid());
        addFavourite(tamilSeasonId, tamilContestantId, "fmk_share1b", uuid());
        addFavourite(tamilSeasonId, secondId, "fmk_share2a", uuid());

        var result = mockMvc.perform(get("/api/seasons/{id}/rankings", tamilSeasonId))
            .andExpect(status().isOk())
            .andReturn();

        com.fasterxml.jackson.databind.JsonNode rankings =
            mapper.readTree(result.getResponse().getContentAsString()).path("data").path("rankings");

        double shareA = 0, shareB = 0;
        for (com.fasterxml.jackson.databind.JsonNode node : rankings) {
            long id = node.path("contestantId").asLong();
            if (id == tamilContestantId) shareA = node.path("voteShare").asDouble();
            if (id == secondId)          shareB = node.path("voteShare").asDouble();
        }
        assertThat(shareA).isCloseTo(66.667, org.assertj.core.data.Offset.offset(0.1));
        assertThat(shareB).isCloseTo(33.333, org.assertj.core.data.Offset.offset(0.1));
    }

    @Test
    void zeroVoteEventShowsZeroPercent() throws Exception {
        var result = mockMvc.perform(get("/api/seasons/{id}/rankings", tamilSeasonId))
            .andExpect(status().isOk())
            .andReturn();

        com.fasterxml.jackson.databind.JsonNode rankings =
            mapper.readTree(result.getResponse().getContentAsString()).path("data").path("rankings");

        assertThat(rankings.size()).isGreaterThan(0);
        for (com.fasterxml.jackson.databind.JsonNode node : rankings) {
            assertThat(node.path("voteShare").asDouble()).isEqualTo(0.0);
        }
    }

    @Test
    void voteShareAlwaysBetweenZeroAndHundred() throws Exception {
        addFavourite(tamilSeasonId, tamilContestantId, "fmk_range1", uuid());

        var result = mockMvc.perform(get("/api/seasons/{id}/rankings", tamilSeasonId))
            .andExpect(status().isOk())
            .andReturn();

        com.fasterxml.jackson.databind.JsonNode rankings =
            mapper.readTree(result.getResponse().getContentAsString()).path("data").path("rankings");

        for (com.fasterxml.jackson.databind.JsonNode node : rankings) {
            double share = node.path("voteShare").asDouble();
            assertThat(share).isGreaterThanOrEqualTo(0.0);
            assertThat(share).isLessThanOrEqualTo(100.0);
        }
    }

    @Test
    void countChangeUpdatesVoteShare() throws Exception {
        // Before any votes: all 0.0
        var before = mockMvc.perform(get("/api/seasons/{id}/rankings", tamilSeasonId))
            .andReturn();
        double shareBefore = mapper.readTree(before.getResponse().getContentAsString())
            .path("data").path("rankings").get(0).path("voteShare").asDouble();
        assertThat(shareBefore).isEqualTo(0.0);

        // Add a vote
        addFavourite(tamilSeasonId, tamilContestantId, "fmk_change1", uuid());

        var after = mockMvc.perform(get("/api/seasons/{id}/rankings", tamilSeasonId))
            .andReturn();
        com.fasterxml.jackson.databind.JsonNode rankings =
            mapper.readTree(after.getResponse().getContentAsString()).path("data").path("rankings");

        double shareAfter = 0;
        for (com.fasterxml.jackson.databind.JsonNode node : rankings) {
            if (node.path("contestantId").asLong() == tamilContestantId) {
                shareAfter = node.path("voteShare").asDouble();
            }
        }
        assertThat(shareAfter).isGreaterThan(0.0);
    }

    @Test
    void historicalVoteCountsRetainedForEliminated() throws Exception {
        Long eliminatedId = jdbc.queryForObject(
            "SELECT id FROM contestants WHERE slug = 'anandhi-ajay'", Long.class);

        // Update the pre-seeded count row to simulate historical votes for the eliminated contestant
        jdbc.update(
            "UPDATE contestant_favourite_counts SET total = 5 " +
            "WHERE season_id = ? AND contestant_id = ?",
            tamilSeasonId, eliminatedId);

        // Fetch rankings — eliminated contestant must not appear
        mockMvc.perform(get("/api/seasons/{id}/rankings", tamilSeasonId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.rankings[*].contestantId",
                not(hasItem(eliminatedId.intValue()))));

        // But their count row must still exist in the DB
        Long retained = jdbc.queryForObject(
            "SELECT total FROM contestant_favourite_counts " +
            "WHERE season_id = ? AND contestant_id = ?",
            Long.class, tamilSeasonId, eliminatedId);
        assertThat(retained).isEqualTo(5L);
    }

    @Test
    void voteShareWorksForBothTamilAndTelugu() throws Exception {
        // Telugu: give one contestant a vote and verify voteShare sums to 100
        addFavourite(teluguSeasonId, teluguContestantId, "fmk_duel_tel1", uuid());

        for (long seasonId : new long[]{tamilSeasonId, teluguSeasonId}) {
            var result = mockMvc.perform(get("/api/seasons/{id}/rankings", seasonId))
                .andExpect(status().isOk())
                .andReturn();

            com.fasterxml.jackson.databind.JsonNode rankings =
                mapper.readTree(result.getResponse().getContentAsString()).path("data").path("rankings");

            assertThat(rankings.size()).isGreaterThan(0);
            double sum = 0;
            for (com.fasterxml.jackson.databind.JsonNode node : rankings) {
                double share = node.path("voteShare").asDouble();
                assertThat(share).isGreaterThanOrEqualTo(0.0);
                assertThat(share).isLessThanOrEqualTo(100.0);
                sum += share;
            }
            // Sum must be 0 (all zero) or approximately 100 (some votes exist)
            assertThat(sum == 0.0 || Math.abs(sum - 100.0) < 0.01)
                .as("voteShare sum should be 0 or ~100, was " + sum)
                .isTrue();
        }
    }
}
