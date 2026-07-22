package com.methaltech.sacco.accounting;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Verifies that when a callback secret is configured the mobile-money callback endpoint rejects
 * unsigned and mis-signed requests and only accepts correctly signed payloads. This is the
 * production posture ({@code require-signed-callbacks=true}); the main test suite covers the
 * unsigned local/demo posture.
 */
@AutoConfigureMockMvc
@SpringBootTest(properties = {
        "sacco.integrations.mobile-money.callback-secret=test_shared_secret_123",
        "sacco.integrations.mobile-money.require-signed-callbacks=true"
})
class MobileMoneyCallbackSignatureTest {

    private static final String SECRET = "test_shared_secret_123";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void unsignedCallbackIsRejectedWhenSecretConfigured() throws Exception {
        String body = callbackBody("MM-SIG-UNSIGNED-" + System.currentTimeMillis());

        mockMvc.perform(post("/api/v1/integrations/mobile-money/callback")
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code", is("CALLBACK_SIGNATURE_REQUIRED")));
    }

    @Test
    void invalidSignatureIsRejected() throws Exception {
        String body = callbackBody("MM-SIG-BAD-" + System.currentTimeMillis());

        mockMvc.perform(post("/api/v1/integrations/mobile-money/callback")
                        .contentType("application/json")
                        .header(MobileMoneyCallbackVerifier.SIGNATURE_HEADER, "deadbeef")
                        .content(body))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code", is("CALLBACK_SIGNATURE_INVALID")));
    }

    @Test
    void correctlySignedCallbackIsAcceptedAndPosted() throws Exception {
        String body = callbackBody("MM-SIG-OK-" + System.currentTimeMillis());
        String signature = sign(body);

        mockMvc.perform(post("/api/v1/integrations/mobile-money/callback")
                        .contentType("application/json")
                        .header(MobileMoneyCallbackVerifier.SIGNATURE_HEADER, signature)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status", is("posted")))
                .andExpect(jsonPath("$.data.memberId", is("member_green_daniel")));
    }

    private static String callbackBody(String externalReference) {
        return """
                {
                  "tenantId": "tenant_green",
                  "memberIdentifier": "GVS-0002",
                  "purpose": "share_purchase",
                  "amount": 45000,
                  "externalReference": "%s",
                  "provider": "demo_mobile_money"
                }
                """.formatted(externalReference);
    }

    private static String sign(String body) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(body.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }
}
