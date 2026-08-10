package com.methaltech.sacco.chat;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.ObjectMapper;

/**
 * Covers the staff chat surface: listing threads (including the complaint backfill), reading and
 * sending messages, and not-found handling. Tenant isolation reuses the same guard as complaints,
 * which is already covered by the main suite.
 */
@AutoConfigureMockMvc
@SpringBootTest(properties = "sacco.rate-limit.enabled=false")
class ChatControllerTest {

    private static final String BACKFILLED_THREAD = "chat_complaint_green_0001";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void staffListsBackfilledThreadAndReadsMessages() throws Exception {
        String token = login("GVS", "admin@greenvalley.local", "Sacco@12345");

        mockMvc.perform(get("/api/v1/chat/threads")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].complaintId", hasItem("complaint_green_0001")))
                .andExpect(jsonPath("$.data[*].type", hasItem("MEMBER_SUPPORT")));

        mockMvc.perform(get("/api/v1/chat/threads/" + BACKFILLED_THREAD + "/messages")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.data[0].senderType", is("STAFF")));
    }

    @Test
    void staffSendsMessageOnThread() throws Exception {
        String token = login("GVS", "admin@greenvalley.local", "Sacco@12345");

        mockMvc.perform(post("/api/v1/chat/threads/" + BACKFILLED_THREAD + "/messages")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                { "body": "Thank you, we are reviewing your statement now." }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.senderType", is("STAFF")))
                .andExpect(jsonPath("$.data.body", is("Thank you, we are reviewing your statement now.")));

        mockMvc.perform(post("/api/v1/chat/threads/" + BACKFILLED_THREAD + "/messages")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                { "body": "" }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void unknownThreadReturnsNotFound() throws Exception {
        String token = login("GVS", "admin@greenvalley.local", "Sacco@12345");

        mockMvc.perform(get("/api/v1/chat/threads/chat_missing/messages")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code", is("CHAT_THREAD_NOT_FOUND")));
    }

    private String login(String saccoCode, String username, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content("""
                                {
                                  "saccoCode": "%s",
                                  "username": "%s",
                                  "password": "%s"
                                }
                                """.formatted(saccoCode, username, password)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).path("data").path("token").asString();
    }
}
