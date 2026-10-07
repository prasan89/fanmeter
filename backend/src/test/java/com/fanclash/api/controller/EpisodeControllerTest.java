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
    void getEpisodesBySeasonReturnsEpisodes() throws Exception {
        mockMvc.perform(get("/api/seasons/1/episodes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    void getEpisodesByUnknownSeasonReturns404() throws Exception {
        mockMvc.perform(get("/api/seasons/9999/episodes"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void getEpisodeByIdReturnsEpisode() throws Exception {
        mockMvc.perform(get("/api/episodes/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1));
    }

    @Test
    void getEpisodeByUnknownIdReturns404() throws Exception {
        mockMvc.perform(get("/api/episodes/99999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }
}
