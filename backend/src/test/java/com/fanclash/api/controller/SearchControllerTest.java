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
class SearchControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void searchWithQueryReturnsResults() throws Exception {
        mockMvc.perform(get("/api/search").param("q", "bigg"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.shows").isArray())
                .andExpect(jsonPath("$.data.contestants").isArray())
                .andExpect(jsonPath("$.data.total").isNumber());
    }

    @Test
    void searchWithNoQueryReturnsEmpty() throws Exception {
        mockMvc.perform(get("/api/search"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.total").value(0));
    }

    @Test
    void searchWithShortQueryReturnsEmpty() throws Exception {
        mockMvc.perform(get("/api/search").param("q", "a"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(0));
    }
}
