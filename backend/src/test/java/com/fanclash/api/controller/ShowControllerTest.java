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
class ShowControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getAllShowsReturnsSuccessResponse() throws Exception {
        mockMvc.perform(get("/api/shows"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    void getShowBySlugReturnsShow() throws Exception {
        mockMvc.perform(get("/api/shows/bigg-boss-tamil"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.slug").value("bigg-boss-tamil"));
    }

    @Test
    void getShowByUnknownSlugReturns404() throws Exception {
        mockMvc.perform(get("/api/shows/nonexistent-show"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void getSeasonsByShowSlugReturnsSeasons() throws Exception {
        mockMvc.perform(get("/api/shows/bigg-boss-tamil/seasons"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }
}
