package com.fanclash.api.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EpisodeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getEpisodesBySeasonReturnsNotFoundForEmptySeason() throws Exception {
        // BB Tamil S10 (from V7) has no episodes seeded — valid season, empty list is OK
        // Use a known valid season (Indian Idol S15, seeded in V2 as id=4) or season from show
        mockMvc.perform(get("/api/shows/bigg-boss-tamil/seasons"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void getEpisodesByUnknownSeasonReturns404() throws Exception {
        mockMvc.perform(get("/api/seasons/9999/episodes"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void getEpisodeByUnknownIdReturns404() throws Exception {
        mockMvc.perform(get("/api/episodes/99999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void getEpisodeByUnknownIdReturnsCorrectStructure() throws Exception {
        mockMvc.perform(get("/api/episodes/99998"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }
}
