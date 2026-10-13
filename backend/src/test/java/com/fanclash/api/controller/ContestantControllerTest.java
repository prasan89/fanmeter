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
class ContestantControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getContestantsBySeasonReturnsContestants() throws Exception {
        // V7 inserts BB Tamil S10 — query by show slug then season to get a valid season id dynamically
        mockMvc.perform(get("/api/shows/bigg-boss-tamil/seasons"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].showSlug").value("bigg-boss-tamil"));
    }

    @Test
    void getContestantBySlugReturnsContestant() throws Exception {
        // V7 inserts avinash-ashok for BB Tamil S10
        mockMvc.perform(get("/api/contestants/avinash-ashok"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.slug").value("avinash-ashok"));
    }

    @Test
    void getContestantByUnknownSlugReturns404() throws Exception {
        mockMvc.perform(get("/api/contestants/nobody-here"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }
}
