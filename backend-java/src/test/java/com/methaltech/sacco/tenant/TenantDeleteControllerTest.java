package com.methaltech.sacco.tenant;

import com.methaltech.sacco.PostgresIntegrationTest;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Covers the platform-admin "delete SACCO" surface end to end: a throwaway SACCO is created and then
 * deleted (net-zero for the shared test database), plus the confirmation, platform-tenant protection and
 * permission guards. Confirms the V137/V138 {@code tenants:delete} grant reaches the platform administrator.
 */
@AutoConfigureMockMvc
@SpringBootTest(properties = { "sacco.rate-limit.enabled=false", "sacco.tenant-purge.enabled=true" })
class TenantDeleteControllerTest extends PostgresIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void platformAdminCreatesConfirmsAndDeletesASacco() throws Exception {
        String token = platformToken();
        JsonNode created = createThrowawaySacco(token, "Delete Me SACCO");
        String tenantId = created.path("id").asString();
        String code = created.path("abbreviation").asString();

        // Wrong confirmation code is rejected and nothing is deleted.
        mockMvc.perform(delete("/api/v1/tenants/" + tenantId)
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{ \"confirmCode\": \"WRONG\" }"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code", is("DELETE_CONFIRMATION_MISMATCH")));

        mockMvc.perform(get("/api/v1/tenants/" + tenantId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        // Correct SACCO code permanently removes the SACCO and everything it owns.
        mockMvc.perform(delete("/api/v1/tenants/" + tenantId)
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{ \"confirmCode\": \"" + code + "\" }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tenantId", is(tenantId)))
                .andExpect(jsonPath("$.data.rowsRemoved", greaterThanOrEqualTo(1)));

        mockMvc.perform(get("/api/v1/tenants/" + tenantId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code", is("TENANT_NOT_FOUND")));
    }

    @Test
    void registrationNumberIsOptionalAndSaccoDetailsCanBeUpdated() throws Exception {
        String token = platformToken();
        JsonNode created = createThrowawaySacco(token, "Editable SACCO");
        String tenantId = created.path("id").asString();
        String code = created.path("abbreviation").asString();

        mockMvc.perform(patch("/api/v1/tenants/" + tenantId + "/details")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {
                                  "name": "Edited SACCO",
                                  "registrationNo": "",
                                  "district": "Wakiso",
                                  "country": "Uganda"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name", is("Edited SACCO")))
                .andExpect(jsonPath("$.data.registrationNo", is("")))
                .andExpect(jsonPath("$.data.district", is("Wakiso")));

        mockMvc.perform(get("/api/v1/tenants/" + tenantId + "/profile")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.legalName", is("Edited SACCO")))
                .andExpect(jsonPath("$.data.cooperativeRegistrationNo", is("")));

        mockMvc.perform(delete("/api/v1/tenants/" + tenantId)
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{ \"confirmCode\": \"" + code + "\" }"))
                .andExpect(status().isOk());
    }

    @Test
    void publicRegistrationAcceptsMissingRegistrationNumber() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/public/sacco-registrations")
                        .contentType("application/json")
                        .content("""
                                {
                                  "name": "Optional Number SACCO %d",
                                  "district": "Kampala",
                                  "parish": "Central",
                                  "village": "Market",
                                  "country": "Uganda",
                                  "localeCode": "en-UG",
                                  "currencyCode": "UGX",
                                  "currencyDigits": 0,
                                  "contactNumber": "+256700000001",
                                  "memberRange": "1-50",
                                  "paymentPhone": "+256700000001"
                                }
                                """.formatted(System.nanoTime())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.tenant.registrationNo", is("")))
                .andReturn();

        JsonNode tenant = objectMapper.readTree(result.getResponse().getContentAsString()).path("data").path("tenant");
        mockMvc.perform(delete("/api/v1/tenants/" + tenant.path("id").asString())
                        .header("Authorization", "Bearer " + platformToken())
                        .contentType("application/json")
                        .content("{ \"confirmCode\": \"" + tenant.path("abbreviation").asString() + "\" }"))
                .andExpect(status().isOk());
    }

    @Test
    void postedFinancialHistoryPreventsPermanentDeletion() throws Exception {
        String token = platformToken();

        mockMvc.perform(delete("/api/v1/tenants/tenant_green")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{ \"confirmCode\": \"GREE\" }"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code", is("TENANT_HAS_FINANCIAL_HISTORY")));

        mockMvc.perform(get("/api/v1/tenants/tenant_green")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void thePlatformTenantCanNeverBeDeleted() throws Exception {
        String token = platformToken();

        mockMvc.perform(delete("/api/v1/tenants/tenant_platform")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{ \"confirmCode\": \"PLAT\" }"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code", is("PLATFORM_TENANT_PROTECTED")));
    }

    @Test
    void aSaccoAdminCannotDeleteTenants() throws Exception {
        String saccoAdminToken = staffLogin("GREE", "admin@greenvalley.local", "Sacco@12345");

        mockMvc.perform(delete("/api/v1/tenants/tenant_lake")
                        .header("Authorization", "Bearer " + saccoAdminToken)
                        .contentType("application/json")
                        .content("{ \"confirmCode\": \"LAKE\" }"))
                .andExpect(status().isForbidden());
    }

    @Test
    void purgeAllRequiresTheExactConfirmationPhrase() throws Exception {
        String token = platformToken();

        // Wrong phrase must be a no-op guard - never wipe every SACCO on a typo.
        mockMvc.perform(post("/api/v1/tenants/purge-all")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                { "confirm": "delete all" }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code", is("PURGE_ALL_CONFIRMATION_MISMATCH")));
    }

    @Test
    void activationRequiresOfficialsAndCredentialButtonActivatesMember() throws Exception {
        String token = platformToken();
        JsonNode tenant = createThrowawaySacco(token, "Official Test SACCO");
        String tenantId = tenant.path("id").asString();
        String tenantCode = tenant.path("abbreviation").asString();
        String branchId = createBranch(token, tenantId);
        String chair = createMember(token, tenantId, branchId, tenantCode + "-9001", "Chair Person");
        String secretary = createMember(token, tenantId, branchId, tenantCode + "-9002", "Secretary Person");
        String treasurer = createMember(token, tenantId, branchId, tenantCode + "-9003", "Treasurer Person");
        String replacementSecretary = createMember(token, tenantId, branchId, tenantCode + "-9004", "Replacement Secretary");

        mockMvc.perform(patch("/api/v1/tenants/" + tenantId + "/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                { "status": "active" }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code", is("SACCO_OFFICIALS_REQUIRED")));

        assignOfficial(token, tenantId, "chairman", chair)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].office", hasItem("chairperson")));

        mockMvc.perform(post("/api/v1/members/" + chair + "/activation-credentials")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                { "channel": "email" }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.memberId", is(chair)))
                .andExpect(jsonPath("$.data.status", is("active")))
                .andExpect(jsonPath("$.data.channel", is("email")))
                .andExpect(jsonPath("$.data.sent", is(true)));

        mockMvc.perform(post("/api/v1/member-auth/login")
                        .contentType("application/json")
                        .content("""
                                {
                                  "saccoCode": "%s",
                                  "identifier": "%s",
                                  "password": "Member@12345"
                                }
                                """.formatted(tenantCode, tenantCode + "-9001")))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(patch("/api/v1/tenants/" + tenantId + "/officials/secretary")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                { "memberId": "%s" }
                                """.formatted(chair)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code", is("OFFICIAL_ALREADY_ASSIGNED")));

        assignOfficial(token, tenantId, "secretary", secretary).andExpect(status().isOk());
        assignOfficial(token, tenantId, "treasurer", treasurer).andExpect(status().isOk());
        assignOfficial(token, tenantId, "secretary", replacementSecretary)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.office == 'secretary')].memberId", hasItem(replacementSecretary)));

        mockMvc.perform(patch("/api/v1/tenants/" + tenantId + "/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                { "status": "active" }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("active")));

        mockMvc.perform(delete("/api/v1/tenants/" + tenantId)
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                { "confirmCode": "%s" }
                                """.formatted(tenantCode)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rowsRemoved", greaterThanOrEqualTo(1)));
    }

    private org.springframework.test.web.servlet.ResultActions assignOfficial(
            String token, String tenantId, String office, String memberId) throws Exception {
        return mockMvc.perform(patch("/api/v1/tenants/" + tenantId + "/officials/" + office)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("""
                        { "memberId": "%s" }
                        """.formatted(memberId)));
    }

    private String createBranch(String token, String tenantId) throws Exception {
        MvcResult created = mockMvc.perform(post("/api/v1/branches")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {
                                  "tenantId": "%s",
                                  "code": "MAIN-%d",
                                  "name": "Main Branch",
                                  "status": "active"
                                }
                                """.formatted(tenantId, System.nanoTime())))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(created.getResponse().getContentAsString()).path("data").path("id").asString();
    }

    private String createMember(String token, String tenantId, String branchId, String membershipNo, String fullName) throws Exception {
        MvcResult created = mockMvc.perform(post("/api/v1/members")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {
                                  "tenantId": "%s",
                                  "branchId": "%s",
                                  "membershipNo": "%s",
                                  "fullName": "%s",
                                  "memberType": "individual",
                                  "phone": "+256700%s",
                                  "email": "%s@example.local",
                                  "password": "Member@12345"
                                }
                                """.formatted(tenantId, branchId, membershipNo, fullName, System.nanoTime(), membershipNo.toLowerCase())))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(created.getResponse().getContentAsString()).path("data").path("id").asString();
    }

    private JsonNode createThrowawaySacco(String token, String name) throws Exception {
        MvcResult created = mockMvc.perform(post("/api/v1/tenants")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {
                                  "name": "%s",
                                  "registrationNo": "COOP-DELETE-%d",
                                  "district": "Kampala",
                                  "country": "Uganda",
                                  "localeCode": "en-UG",
                                  "currencyCode": "UGX",
                                  "currencyDigits": 0,
                                  "packageId": "starter"
                                }
                                """.formatted(name, System.currentTimeMillis())))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(created.getResponse().getContentAsString()).path("data");
    }

    private String platformToken() throws Exception {
        return staffLogin("PLATFORM", "admin@platform.local", "Admin@12345");
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
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("token").asString();
    }
}
