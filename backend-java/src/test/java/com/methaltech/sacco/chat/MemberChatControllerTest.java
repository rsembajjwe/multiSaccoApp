package com.methaltech.sacco.chat;

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
 * Members see and reply only in their own MEMBER_SUPPORT threads; unknown/foreign threads 404.
 */
@AutoConfigureMockMvc
@SpringBootTest(properties = "sacco.rate-limit.enabled=false")
class MemberChatControllerTest {

    private static final String OWN_THREAD = "chat_complaint_green_0001";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void memberSeesOwnThreadAndCanReply() throws Exception {
        String token = memberLogin("GVS-0001", "Member@12345");

        mockMvc.perform(get("/api/v1/member-auth/chat/threads")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].id", hasItem(OWN_THREAD)))
                .andExpect(jsonPath("$.data[*].type", hasItem("MEMBER_SUPPORT")));

        mockMvc.perform(post("/api/v1/member-auth/chat/threads/" + OWN_THREAD + "/messages")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                { "body": "Thank you, I have received the clarification." }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.senderType", is("MEMBER")));
    }

    @Test
    void memberCannotAccessUnknownThread() throws Exception {
        String token = memberLogin("GVS-0001", "Member@12345");

        mockMvc.perform(get("/api/v1/member-auth/chat/threads/chat_not_mine/messages")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code", is("CHAT_THREAD_NOT_FOUND")));
    }

    @Test
    void memberCanStartNewThread() throws Exception {
        String token = memberLogin("GVS-0001", "Member@12345");

        mockMvc.perform(post("/api/v1/member-auth/chat/threads")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {
                                  "subject": "Loan statement question",
                                  "message": "Please confirm my last repayment was received."
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.type", is("MEMBER_SUPPORT")))
                .andExpect(jsonPath("$.data.subject", is("Loan statement question")));
    }

    @Test
    void memberIsNotifiedWhenStaffReplies() throws Exception {
        String staff = staffLogin("GVS", "admin@greenvalley.local", "Sacco@12345");
        mockMvc.perform(post("/api/v1/chat/threads/" + OWN_THREAD + "/messages")
                        .header("Authorization", "Bearer " + staff)
                        .contentType("application/json")
                        .content("""
                                { "body": "We have resolved your query." }
                                """))
                .andExpect(status().isCreated());

        String member = memberLogin("GVS-0001", "Member@12345");
        mockMvc.perform(get("/api/v1/member-auth/notifications")
                        .header("Authorization", "Bearer " + member))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].eventType", hasItem("chat_reply")));
    }

    private String staffLogin(String saccoCode, String username, String password) throws Exception {
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

    private String memberLogin(String identifier, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/member-auth/login")
                        .contentType("application/json")
                        .content("""
                                {
                                  "identifier": "%s",
                                  "password": "%s"
                                }
                                """.formatted(identifier, password)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).path("data").path("token").asString();
    }
}
