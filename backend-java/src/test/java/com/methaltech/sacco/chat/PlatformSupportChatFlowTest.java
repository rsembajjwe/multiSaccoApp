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
 * End-to-end proof of the SACCO-admin &lt;-&gt; Platform Super Admin relationship:
 * a SACCO admin opens a PLATFORM_SUPPORT thread, the platform admin sees it across tenants and
 * replies, the SACCO admin reads the reply, and a member cannot see the platform thread.
 */
@AutoConfigureMockMvc
@SpringBootTest(properties = "sacco.rate-limit.enabled=false")
class PlatformSupportChatFlowTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void saccoAdminAndPlatformAdminExchangeMessagesAndMemberIsExcluded() throws Exception {
        String saccoToken = staffLogin("GVS", "admin@greenvalley.local", "Sacco@12345");
        String platformToken = staffLogin("PLATFORM", "admin@platform.local", "Admin@12345");

        MvcResult created = mockMvc.perform(post("/api/v1/chat/threads")
                        .header("Authorization", "Bearer " + saccoToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "type": "PLATFORM_SUPPORT",
                                  "subject": "Subscription invoice question",
                                  "message": "Could you confirm our current billing tier?"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.type", is("PLATFORM_SUPPORT")))
                .andReturn();
        String threadId = objectMapper.readTree(created.getResponse().getContentAsString())
                .path("data").path("id").asString();

        mockMvc.perform(get("/api/v1/chat/threads?type=PLATFORM_SUPPORT")
                        .header("Authorization", "Bearer " + platformToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].id", hasItem(threadId)));

        mockMvc.perform(post("/api/v1/chat/threads/" + threadId + "/messages")
                        .header("Authorization", "Bearer " + platformToken)
                        .contentType("application/json")
                        .content("""
                                { "body": "You are on the per-member tier, minimum 100 members." }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.senderType", is("PLATFORM")));

        mockMvc.perform(get("/api/v1/chat/threads/" + threadId + "/messages")
                        .header("Authorization", "Bearer " + saccoToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[1].senderType", is("PLATFORM")));

        String memberToken = memberLogin("GVS-0001", "Member@12345");
        mockMvc.perform(get("/api/v1/member-auth/chat/threads/" + threadId + "/messages")
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isNotFound());
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
