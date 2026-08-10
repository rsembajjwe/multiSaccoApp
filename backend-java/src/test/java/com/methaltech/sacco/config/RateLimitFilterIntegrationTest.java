package com.methaltech.sacco.config;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

/**
 * End-to-end check that {@link RateLimitFilter} throttles an abuse-prone endpoint with a real Spring
 * context. Password-reset requests are limited to two per window here so the third is rejected with
 * 429. (Login itself is intentionally not filtered — it uses failure-based lockout instead.)
 */
@AutoConfigureMockMvc
@SpringBootTest(properties = {
        "sacco.rate-limit.enabled=true",
        "sacco.rate-limit.window=60s",
        "sacco.rate-limit.auth-per-window=2"
})
class RateLimitFilterIntegrationTest {

    private static final String RESET_BODY = """
            { "email": "nobody@example.com" }
            """;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void throttlesSensitiveAuthRequestsBeyondTheConfiguredBudget() throws Exception {
        // The first two requests are permitted through the filter (outcome irrelevant — they consume
        // the per-IP budget regardless of whether the email matches a user).
        for (int i = 0; i < 2; i++) {
            mockMvc.perform(post("/api/v1/auth/password-reset/request").contentType("application/json").content(RESET_BODY));
        }

        mockMvc.perform(post("/api/v1/auth/password-reset/request").contentType("application/json").content(RESET_BODY))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.error.code", is("RATE_LIMIT_EXCEEDED")));
    }
}
