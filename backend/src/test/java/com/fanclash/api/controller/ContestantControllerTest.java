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
        mockMvc.perform(get("/api/seasons/1/contestants"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    void getContestantBySlugReturnsContestant() throws Exception {
        mockMvc.perform(get("/api/contestants/aravind"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.slug").value("aravind"));
    }

    @Test
    void getContestantByUnknownSlugReturns404() throws Exception {
        mockMvc.perform(get("/api/contestants/nobody-here"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }
}
