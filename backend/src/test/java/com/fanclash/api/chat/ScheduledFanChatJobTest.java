package com.fanclash.api.chat;

import com.fanclash.api.chat.bot.FanCommentGenerator;
import com.fanclash.api.chat.bot.ScheduledFanChatJob;
import com.fanclash.api.chat.dto.ChatMessageDto;
import com.fanclash.api.chat.service.ChatService;
import com.fanclash.api.dto.ContestantRankingDto;
import com.fanclash.api.dto.RankingsDto;
import com.fanclash.api.service.FavouriteService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class ScheduledFanChatJobTest {

    @Mock FavouriteService    favouriteService;
    @Mock FanCommentGenerator commentGenerator;
    @Mock ChatService         chatService;

    @InjectMocks
    ScheduledFanChatJob job;

    private static final String ROOM_ID    = "event:bigg-boss-tamil-10:season:6";
    private static final long   SEASON_ID  = 6L;

    @BeforeEach
    void setUp() {
        // Inject @Value fields that Spring would normally bind
        ReflectionTestUtils.setField(job, "minComments",      5);
        ReflectionTestUtils.setField(job, "maxComments",      10);
        ReflectionTestUtils.setField(job, "maxPerContestant", 3);
        ReflectionTestUtils.setField(job, "targets",          "bigg-boss-tamil-10:6");
    }

    // ── Rankings-driven generation ────────────────────────────────────────────

    private RankingsDto sampleRankings() {
        List<ContestantRankingDto> rankings = List.of(
            new ContestantRankingDto(1L, "TTF Vasan",  "ttf-vasan",  null, "active", 334957, 1, 62.8),
            new ContestantRankingDto(2L, "Shathiga",   "shathiga",   null, "active", 44126,  2, 8.3),
            new ContestantRankingDto(3L, "Rockzzz",    "rockzzz",    null, "active", 22000,  3, 4.1),
            new ContestantRankingDto(4L, "Mukesh",     "mukesh",     null, "active", 18000,  4, 3.4)
        );
        return new RankingsDto(SEASON_ID, "BB Tamil S10", "bigg-boss-tamil",
                rankings, java.util.Collections.emptySet(), LocalDateTime.now());
    }

    private ChatMessageDto sampleDto(int n) {
        return new ChatMessageDto(n, ROOM_ID, "FanMeterBot", "Test comment " + n,
                Instant.now(), false, true);
    }

    @Test
    void publishesCommentsWhenRankingsAvailable() {
        when(favouriteService.getRankings(SEASON_ID, null)).thenReturn(sampleRankings());
        when(commentGenerator.generate(any(), anyInt(), anyInt()))
                .thenReturn(List.of("TTF Vasan fans strong!", "Rockzzz let's go!",
                        "Shathiga is climbing!", "Great week!", "Vote now!"));
        when(chatService.publishBotMessage(any(), any(), any(), any(), any(), any()))
                .thenReturn(Optional.of(sampleDto(1)));

        job.executeRun();

        verify(chatService, times(5))
                .publishBotMessage(eq(ROOM_ID), any(), any(), any(), any(), any());
    }

    @Test
    void skipsRunWhenRankingsEmpty() {
        RankingsDto empty = new RankingsDto(SEASON_ID, "BB Tamil S10", "bigg-boss-tamil",
                List.of(), java.util.Collections.emptySet(), LocalDateTime.now());
        when(favouriteService.getRankings(SEASON_ID, null)).thenReturn(empty);

        job.executeRun();

        verify(commentGenerator, never()).generate(any(), anyInt(), anyInt());
        verify(chatService, never()).publishBotMessage(any(), any(), any(), any(), any(), any());
    }

    @Test
    void skipsRunWhenRankingsServiceThrows() {
        when(favouriteService.getRankings(SEASON_ID, null))
                .thenThrow(new RuntimeException("DB unavailable"));

        // Should not throw — graceful degradation
        assertDoesNotThrow(() -> job.executeRun());
        verify(chatService, never()).publishBotMessage(any(), any(), any(), any(), any(), any());
    }

    @Test
    void skipsRunWhenGeneratorReturnsEmptyList() {
        when(favouriteService.getRankings(SEASON_ID, null)).thenReturn(sampleRankings());
        when(commentGenerator.generate(any(), anyInt(), anyInt())).thenReturn(List.of());

        job.executeRun();

        verify(chatService, never()).publishBotMessage(any(), any(), any(), any(), any(), any());
    }

    @Test
    void rockzzzAppearsInRankingsPassedToGenerator() {
        when(favouriteService.getRankings(SEASON_ID, null)).thenReturn(sampleRankings());
        when(commentGenerator.generate(any(), anyInt(), anyInt())).thenReturn(List.of("ok"));
        when(chatService.publishBotMessage(any(), any(), any(), any(), any(), any()))
                .thenReturn(Optional.of(sampleDto(1)));

        job.executeRun();

        verify(commentGenerator).generate(argThat(rankings ->
                rankings.stream().anyMatch(r -> "rockzzz".equals(r.contestantSlug()))
        ), anyInt(), anyInt());
    }

    @Test
    void generatedCommentUsesCorrectBotType() {
        when(favouriteService.getRankings(SEASON_ID, null)).thenReturn(sampleRankings());
        when(commentGenerator.generate(any(), anyInt(), anyInt()))
                .thenReturn(List.of("Let's vote!"));
        when(chatService.publishBotMessage(any(), any(), any(), any(), any(), any()))
                .thenReturn(Optional.of(sampleDto(1)));

        job.executeRun();

        verify(chatService).publishBotMessage(
                eq(ROOM_ID),
                eq(ScheduledFanChatJob.BOT_TOKEN),
                eq(ScheduledFanChatJob.BOT_DISPLAY_NAME),
                any(),
                eq(ScheduledFanChatJob.BOT_TYPE),
                any()
        );
    }

    @Test
    void moderationBlockDoesNotCountAsPublished() {
        when(favouriteService.getRankings(SEASON_ID, null)).thenReturn(sampleRankings());
        when(commentGenerator.generate(any(), anyInt(), anyInt()))
                .thenReturn(List.of("blocked comment", "safe comment"));
        // First returns empty (blocked), second returns a DTO (published)
        when(chatService.publishBotMessage(any(), any(), any(), eq("blocked comment"), any(), any()))
                .thenReturn(Optional.empty());
        when(chatService.publishBotMessage(any(), any(), any(), eq("safe comment"), any(), any()))
                .thenReturn(Optional.of(sampleDto(2)));

        // Should not throw even when some messages are blocked
        assertDoesNotThrow(() -> job.executeRun());
        verify(chatService, times(2))
                .publishBotMessage(any(), any(), any(), any(), any(), any());
    }

    @Test
    void invalidTargetFormatIsSkipped() {
        ReflectionTestUtils.setField(job, "targets", "bad-target-no-colon");
        // Should not throw, should not call favouriteService
        assertDoesNotThrow(() -> job.executeRun());
        verify(favouriteService, never()).getRankings(anyLong(), any());
    }

    @Test
    void multipleTargetsAreProcessed() {
        ReflectionTestUtils.setField(job, "targets", "bigg-boss-tamil-10:6,bigg-boss-telugu-10:7");

        RankingsDto rankings = sampleRankings();
        when(favouriteService.getRankings(anyLong(), any())).thenReturn(rankings);
        when(commentGenerator.generate(any(), anyInt(), anyInt()))
                .thenReturn(List.of("Let's go!"));
        when(chatService.publishBotMessage(any(), any(), any(), any(), any(), any()))
                .thenReturn(Optional.of(sampleDto(1)));

        job.executeRun();

        // One call per target
        verify(favouriteService).getRankings(6L, null);
        verify(favouriteService).getRankings(7L, null);
    }
}
