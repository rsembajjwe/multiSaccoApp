package com.methaltech.sacco;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
@SpringBootTest
class SaccoBackendApplicationTests {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Test
	void contextLoads() {
	}

	@Test
	void healthEndpointUsesApiEnvelopeAndSecurityHeaders() throws Exception {
		mockMvc.perform(get("/api/v1/health"))
				.andExpect(status().isOk())
				.andExpect(header().string("X-Content-Type-Options", "nosniff"))
				.andExpect(header().string("X-Frame-Options", "DENY"))
				.andExpect(header().string("Referrer-Policy", "no-referrer"))
				.andExpect(jsonPath("$.data.ok", is(true)))
				.andExpect(jsonPath("$.data.service", is("multiSaccoApp Java API")));
	}

	@Test
	void operationsStatusReportsPlatformAndTenantSignals() throws Exception {
		String platformToken = loginAndReturnToken();
		String saccoToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		mockMvc.perform(get("/api/v1/operations/status")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.ok", is(true)))
				.andExpect(jsonPath("$.data.scope", is("platform")))
				.andExpect(jsonPath("$.data.database.reachable", is(true)))
				.andExpect(jsonPath("$.data.counts.tenants", greaterThanOrEqualTo(3)))
				.andExpect(jsonPath("$.data.counts.members", greaterThanOrEqualTo(3)))
				.andExpect(jsonPath("$.data.alerts.length()", greaterThanOrEqualTo(1)));

		mockMvc.perform(get("/api/v1/operations/status")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.scope", is("tenant_green")))
				.andExpect(jsonPath("$.data.counts.tenants", is(1)))
				.andExpect(jsonPath("$.data.counts.members", greaterThanOrEqualTo(2)));

		mockMvc.perform(get("/api/v1/operations/status?tenantId=tenant_lake")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));
	}

	@Test
	void tenantsEndpointReturnsSeededTenants() throws Exception {
		String token = loginAndReturnToken();

		mockMvc.perform(get("/api/v1/tenants")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(header().string("X-Content-Type-Options", "nosniff"))
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(3)))
				.andExpect(jsonPath("$.data[0].name", is("Green Valley SACCO")))
				.andExpect(jsonPath("$.data[0].registrationNo", is("COOP/GVS/2018/014")))
				.andExpect(jsonPath("$.data[0].packageId", is("starter")));
	}

	@Test
	void saccoUserCanOnlyViewOwnTenant() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		mockMvc.perform(get("/api/v1/tenants")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", is(1)))
				.andExpect(jsonPath("$.data[0].id", is("tenant_green")));

		mockMvc.perform(get("/api/v1/tenants/tenant_lake")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));
	}

	@Test
	void platformUserCanCreateAndApproveTenant() throws Exception {
		String token = loginAndReturnToken();
		String registrationNo = "COOP-SMOKE-" + System.currentTimeMillis();

		MvcResult createdTenant = mockMvc.perform(post("/api/v1/tenants")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "name": "Smoke Java SACCO",
								  "abbreviation": "sjs",
								  "registrationNo": "%s",
								  "district": "Kampala",
								  "licenseExpiry": "2027-12-31",
								  "packageId": "starter"
								}
								""".formatted(registrationNo)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.status", is("pending_review")))
				.andExpect(jsonPath("$.data.abbreviation", is("SJS")))
				.andReturn();

		String tenantId = objectMapper.readTree(createdTenant.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(get("/api/v1/tenants/" + tenantId)
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.registrationNo", is(registrationNo)));

		mockMvc.perform(get("/api/v1/tenants/" + tenantId + "/profile")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.tenantId", is(tenantId)))
				.andExpect(jsonPath("$.data.legalName", is("Smoke Java SACCO")))
				.andExpect(jsonPath("$.data.cooperativeRegistrationNo", is(registrationNo)));

		mockMvc.perform(patch("/api/v1/tenants/" + tenantId + "/status")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{ "status": "approved" }
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status", is("approved")));

		mockMvc.perform(get("/api/v1/audit-events")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].action", is("Updated tenant status to approved")));
	}

	@Test
	void saccoProfileCanBeReadAndUpdatedWithTenantScope() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		mockMvc.perform(get("/api/v1/tenants/tenant_green/profile")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.legalName", is("Green Valley Savings and Credit Cooperative Society Limited")))
				.andExpect(jsonPath("$.data.tin", is("1002456789")))
				.andExpect(jsonPath("$.data.cooperativeRegistrationNo", is("COOP/GVS/2018/014")));

		mockMvc.perform(patch("/api/v1/tenants/tenant_green/profile")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "legalName": "Green Valley SACCO Cooperative Society",
								  "tin": "1002456789-UPDATED",
								  "umraLicenseNo": "UMRA/GVS/2026/999",
								  "cooperativeRegistrationNo": "COOP/GVS/2018/014",
								  "address": "Plot 99 Kampala Road",
								  "email": "registry@greenvalley.example.local",
								  "phone": "+256700999111",
								  "website": "https://greenvalley-sacco.example.local"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.legalName", is("Green Valley SACCO Cooperative Society")))
				.andExpect(jsonPath("$.data.tin", is("1002456789-UPDATED")))
				.andExpect(jsonPath("$.data.email", is("registry@greenvalley.example.local")));

		mockMvc.perform(get("/api/v1/audit-events")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].resourceType", is("sacco_profile")));
	}

	@Test
	void saccoProfileControlsAreEnforced() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String platformToken = loginAndReturnToken();

		mockMvc.perform(get("/api/v1/tenants/tenant_lake/profile")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));

		mockMvc.perform(patch("/api/v1/tenants/tenant_lake/profile")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{ "legalName": "Denied Lake Profile" }
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));

		mockMvc.perform(patch("/api/v1/tenants/tenant_green/profile")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{ "email": "not-an-email" }
								"""))
				.andExpect(status().isBadRequest());

		mockMvc.perform(get("/api/v1/tenants/tenant_missing/profile")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.error.code", is("TENANT_NOT_FOUND")));

		mockMvc.perform(get("/api/v1/tenants/tenant_lake/profile")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_lake")));
	}

	@Test
	void saccoUserCannotCreateOrApproveTenants() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		mockMvc.perform(post("/api/v1/tenants")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "name": "Denied SACCO",
								  "abbreviation": "DEN",
								  "licenseExpiry": "2027-12-31"
								}
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PLATFORM_ADMIN_REQUIRED")));

		mockMvc.perform(patch("/api/v1/tenants/tenant_green/status")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{ "status": "approved" }
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PLATFORM_ADMIN_REQUIRED")));
	}

	@Test
	void subscriptionsUseMemberBasedBillingAndPaymentsFeedJournals() throws Exception {
		String platformToken = loginAndReturnToken();
		String paymentReference = "SUB-SMOKE-" + System.currentTimeMillis();

		mockMvc.perform(get("/api/v1/subscription-packages")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", is(3)))
				.andExpect(jsonPath("$.data[0].id", is("starter")))
				.andExpect(jsonPath("$.data[0].minMembers", is(100)))
				.andExpect(jsonPath("$.data[0].memberLimit", is(500)));

		mockMvc.perform(get("/api/v1/subscriptions?tenantId=tenant_green")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", is(1)))
				.andExpect(jsonPath("$.data[0].tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data[0].memberCount", is(2)))
				.andExpect(jsonPath("$.data[0].billableMembers", is(100)))
				.andExpect(jsonPath("$.data[0].tierId", is("per_member")))
				.andExpect(jsonPath("$.data[0].billingDescription", is("UGX 5,000 per member annually, minimum 100 members")));

		MvcResult payment = mockMvc.perform(post("/api/v1/subscriptions/subscription_lake_starter/payments")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "amount": 500000,
								  "channel": "manual",
								  "externalReference": "%s",
								  "receivedAt": "2026-07-16T09:00:00Z"
								}
								""".formatted(paymentReference)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.idempotent", is(false)))
				.andExpect(jsonPath("$.data.subscription.status", is("active")))
				.andExpect(jsonPath("$.data.payment.tenantId", is("tenant_lake")))
				.andExpect(jsonPath("$.data.payment.externalReference", is(paymentReference)))
				.andReturn();

		mockMvc.perform(post("/api/v1/subscriptions/subscription_lake_starter/payments")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "amount": 500000,
								  "channel": "manual",
								  "externalReference": "%s",
								  "receivedAt": "2026-07-16T09:00:00Z"
								}
								""".formatted(paymentReference)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.idempotent", is(true)))
				.andExpect(jsonPath("$.data.subscription.paid", is(500000.00)))
				.andExpect(jsonPath("$.data.payment.amount", is(500000.00)));

		String paymentId = objectMapper.readTree(payment.getResponse().getContentAsString()).path("data").path("payment").path("id").asString();
		MvcResult journals = mockMvc.perform(get("/api/v1/journal-entries?tenantId=tenant_lake")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andReturn();
		JsonNode journalData = objectMapper.readTree(journals.getResponse().getContentAsString()).path("data");
		if (!hasJournalReference(journalData, paymentReference, "subscription_payment")) {
			throw new AssertionError("Subscription payment journal not found: " + paymentId);
		}
		org.junit.jupiter.api.Assertions.assertEquals(1, countJournalReference(journalData, paymentReference, "subscription_payment"));

		mockMvc.perform(get("/api/v1/subscriptions?tenantId=tenant_lake")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].paid", is(500000.00)))
				.andExpect(jsonPath("$.data[0].status", is("active")));

		mockMvc.perform(get("/api/v1/audit-events")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].resourceType", is("subscription")));
	}

	@Test
	void subscriptionControlsAreEnforced() throws Exception {
		String saccoToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String platformToken = loginAndReturnToken();

		mockMvc.perform(get("/api/v1/subscriptions?tenantId=tenant_lake")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));

		mockMvc.perform(get("/api/v1/subscriptions")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))));

		mockMvc.perform(post("/api/v1/subscriptions/subscription_green_growth/payments")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{ "amount": 1000 }
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PLATFORM_ADMIN_REQUIRED")));

		mockMvc.perform(post("/api/v1/subscriptions/missing-subscription/payments")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{ "amount": 1000 }
								"""))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.error.code", is("SUBSCRIPTION_NOT_FOUND")));

		mockMvc.perform(post("/api/v1/subscriptions/subscription_green_growth/payments")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{ "amount": 0 }
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_PAYMENT_AMOUNT")));

		mockMvc.perform(post("/api/v1/subscriptions/subscription_green_growth/payments")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "amount": 1000,
								  "channel": "bad_channel"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_PAYMENT_CHANNEL")));

		mockMvc.perform(post("/api/v1/subscriptions/subscription_green_growth/payments")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "amount": 1000,
								  "receivedAt": "2026-06-15T09:00:00Z"
								}
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("ACCOUNTING_PERIOD_CLOSED")));
	}

	@Test
	void loginReturnsTokenAndSafeUserProfile() throws Exception {
		mockMvc.perform(post("/api/v1/auth/login")
						.contentType("application/json")
						.content("""
								{
								  "email": "admin@platform.local",
								  "password": "Admin@12345"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(header().string("X-Content-Type-Options", "nosniff"))
				.andExpect(jsonPath("$.data.token", notNullValue()))
				.andExpect(jsonPath("$.data.tokenType", is("Bearer")))
				.andExpect(jsonPath("$.data.user.id", is("user_platform_admin")))
				.andExpect(jsonPath("$.data.user.tenantId", is("tenant_platform")))
				.andExpect(jsonPath("$.data.user.passwordHash").doesNotExist())
				.andExpect(jsonPath("$.data.user.passwordSalt").doesNotExist());
	}

	@Test
	void loginAcceptsSaccoCodeUsernameAndExposesAccess() throws Exception {
		mockMvc.perform(post("/api/v1/auth/login")
						.contentType("application/json")
						.content("""
								{
								  "saccoCode": "PLATFORM",
								  "username": "admin@platform.local",
								  "password": "Admin@12345"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.user.tenantId", is("tenant_platform")))
				.andExpect(jsonPath("$.data.roleNames", hasItem("Platform Administrator")))
				.andExpect(jsonPath("$.data.permissionIds", hasItem("tenants:view")));

		mockMvc.perform(post("/api/v1/auth/login")
						.contentType("application/json")
						.content("""
								{
								  "saccoCode": "GVS",
								  "username": "admin@greenvalley.local",
								  "password": "Sacco@12345"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.user.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.roleNames", hasItem("SACCO Administrator")))
				.andExpect(jsonPath("$.data.permissionIds", hasItem("members:view")));

		mockMvc.perform(post("/api/v1/auth/login")
						.contentType("application/json")
						.content("""
								{
								  "saccoCode": "LFS",
								  "username": "admin@greenvalley.local",
								  "password": "Sacco@12345"
								}
								"""))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.error.code", is("AUTH_INVALID")));
	}

	@Test
	void demoRoleAccountsLoginWithExpectedRoles() throws Exception {
		mockMvc.perform(post("/api/v1/auth/login")
						.contentType("application/json")
						.content("""
								{
								  "saccoCode": "GVS",
								  "username": "treasurer@greenvalley.local",
								  "password": "Treasurer@12345"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.roleNames", hasItem("Treasurer")))
				.andExpect(jsonPath("$.data.permissionIds", hasItem("accounting:post")));

		mockMvc.perform(post("/api/v1/auth/login")
						.contentType("application/json")
						.content("""
								{
								  "saccoCode": "GVS",
								  "username": "secretary@greenvalley.local",
								  "password": "Secretary@12345"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.roleNames", hasItem("Secretary")))
				.andExpect(jsonPath("$.data.permissionIds", hasItem("members:approve")));

		mockMvc.perform(post("/api/v1/auth/login")
						.contentType("application/json")
						.content("""
								{
								  "saccoCode": "GVS",
								  "username": "chairperson@greenvalley.local",
								  "password": "Chair@12345"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.roleNames", hasItem("Chairperson")))
				.andExpect(jsonPath("$.data.permissionIds", hasItem("approvals:decide")));
	}

	@Test
	void loginRejectsBadPassword() throws Exception {
		mockMvc.perform(post("/api/v1/auth/login")
						.contentType("application/json")
						.content("""
								{
								  "email": "admin@platform.local",
								  "password": "wrong"
								}
								"""))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.error.code", is("AUTH_INVALID")));
	}

	@Test
	void passwordResetRotatesStaffPasswordAndRevokesToken() throws Exception {
		String platformToken = loginAndReturnToken();
		String email = "reset-staff-" + System.currentTimeMillis() + "@greenvalley.local";
		mockMvc.perform(post("/api/v1/users")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_green",
								  "fullName": "Reset Smoke Staff",
								  "email": "%s",
								  "password": "Temp@12345"
								}
								""".formatted(email)))
				.andExpect(status().isCreated());
		String activeToken = loginAndReturnToken(email, "Temp@12345");

		MvcResult resetRequest = mockMvc.perform(post("/api/v1/auth/password-reset/request")
						.contentType("application/json")
						.content("""
								{
								  "email": "%s"
								}
								""".formatted(email)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.accepted", is(true)))
				.andExpect(jsonPath("$.data.resetToken", notNullValue()))
				.andReturn();
		String resetToken = objectMapper.readTree(resetRequest.getResponse().getContentAsString()).path("data").path("resetToken").asString();

		mockMvc.perform(post("/api/v1/auth/password-reset/confirm")
						.contentType("application/json")
						.content("""
								{
								  "token": "%s",
								  "newPassword": "short"
								}
								""".formatted(resetToken)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("WEAK_PASSWORD")));

		mockMvc.perform(post("/api/v1/auth/password-reset/confirm")
						.contentType("application/json")
						.content("""
								{
								  "token": "%s",
								  "newPassword": "Reset@12345"
								}
								""".formatted(resetToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.reset", is(true)));

		mockMvc.perform(get("/api/v1/auth/me")
						.header("Authorization", "Bearer " + activeToken))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.error.code", is("AUTH_REQUIRED")));

		mockMvc.perform(post("/api/v1/auth/login")
						.contentType("application/json")
						.content("""
								{
								  "email": "%s",
								  "password": "Temp@12345"
								}
								""".formatted(email)))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.error.code", is("AUTH_INVALID")));

		mockMvc.perform(post("/api/v1/auth/login")
						.contentType("application/json")
						.content("""
								{
								  "email": "%s",
								  "password": "Reset@12345"
								}
								""".formatted(email)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.user.email", is(email)));

		mockMvc.perform(post("/api/v1/auth/password-reset/confirm")
						.contentType("application/json")
						.content("""
								{
								  "token": "%s",
								  "newPassword": "Another@12345"
								}
								""".formatted(resetToken)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_RESET_TOKEN")));
	}

	@Test
	void privilegedStaffCanEnableAndVerifyMfaChallenge() throws Exception {
		String platformToken = loginAndReturnToken();
		String email = "mfa-admin-" + System.currentTimeMillis() + "@greenvalley.local";
		MvcResult createdUser = mockMvc.perform(post("/api/v1/users")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_green",
								  "fullName": "MFA Admin Staff",
								  "email": "%s",
								  "password": "Mfa@12345"
								}
								""".formatted(email)))
				.andExpect(status().isCreated())
				.andReturn();
		String userId = objectMapper.readTree(createdUser.getResponse().getContentAsString()).path("data").path("id").asString();
		mockMvc.perform(put("/api/v1/users/" + userId + "/roles")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "roleIds": ["role_green_admin"]
								}
								"""))
				.andExpect(status().isOk());
		String staffToken = loginAndReturnToken(email, "Mfa@12345");

		mockMvc.perform(post("/api/v1/auth/mfa/enable")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.mfaEnabled", is(true)));

		MvcResult challengeResult = mockMvc.perform(post("/api/v1/auth/login")
						.contentType("application/json")
						.content("""
								{
								  "email": "%s",
								  "password": "Mfa@12345"
								}
								""".formatted(email)))
				.andExpect(status().isAccepted())
				.andExpect(jsonPath("$.data.mfaRequired", is(true)))
				.andExpect(jsonPath("$.data.challengeId", notNullValue()))
				.andExpect(jsonPath("$.data.demoCode", notNullValue()))
				.andExpect(jsonPath("$.data.token").doesNotExist())
				.andReturn();
		JsonNode challenge = objectMapper.readTree(challengeResult.getResponse().getContentAsString()).path("data");
		String challengeId = challenge.path("challengeId").asString();
		String demoCode = challenge.path("demoCode").asString();

		mockMvc.perform(post("/api/v1/auth/mfa/verify")
						.contentType("application/json")
						.content("""
								{
								  "challengeId": "%s",
								  "code": "000000"
								}
								""".formatted(challengeId)))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.error.code", is("MFA_INVALID")));

		mockMvc.perform(post("/api/v1/auth/mfa/verify")
						.contentType("application/json")
						.content("""
								{
								  "challengeId": "%s",
								  "code": "%s"
								}
								""".formatted(challengeId, demoCode)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.token", notNullValue()))
				.andExpect(jsonPath("$.data.user.id", is(userId)));

		mockMvc.perform(post("/api/v1/auth/mfa/verify")
						.contentType("application/json")
						.content("""
								{
								  "challengeId": "%s",
								  "code": "%s"
								}
								""".formatted(challengeId, demoCode)))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.error.code", is("MFA_INVALID")));
	}

	@Test
	void nonPrivilegedStaffCannotEnableMfaFromPrivilegedEndpoint() throws Exception {
		String platformToken = loginAndReturnToken();
		String email = "plain-staff-" + System.currentTimeMillis() + "@greenvalley.local";
		mockMvc.perform(post("/api/v1/users")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_green",
								  "fullName": "Plain Staff",
								  "email": "%s",
								  "password": "Plain@12345"
								}
								""".formatted(email)))
				.andExpect(status().isCreated());
		String token = loginAndReturnToken(email, "Plain@12345");

		mockMvc.perform(post("/api/v1/auth/mfa/enable")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PRIVILEGED_USER_REQUIRED")));
	}

	@Test
	void currentUserEndpointUsesBearerSessionAndLogoutRevokesIt() throws Exception {
		String token = loginAndReturnToken();

		mockMvc.perform(get("/api/v1/auth/me")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.user.id", is("user_platform_admin")))
				.andExpect(jsonPath("$.data.tenant.id", is("tenant_platform")))
				.andExpect(jsonPath("$.data.tenant.name", is("Platform Administration")));

		mockMvc.perform(post("/api/v1/auth/logout")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.loggedOut", is(true)));

		mockMvc.perform(get("/api/v1/auth/me")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.error.code", is("AUTH_REQUIRED")));
	}

	@Test
	void currentUserEndpointRejectsMissingToken() throws Exception {
		mockMvc.perform(get("/api/v1/auth/me"))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.error.code", is("AUTH_REQUIRED")));
	}

	@Test
	void platformUserCanListAllUsers() throws Exception {
		String token = loginAndReturnToken();

		mockMvc.perform(get("/api/v1/users")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(2)))
				.andExpect(jsonPath("$.data[0].passwordHash").doesNotExist())
				.andExpect(jsonPath("$.data[0].passwordSalt").doesNotExist());
	}

	@Test
	void saccoUserListIsTenantScoped() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		mockMvc.perform(get("/api/v1/users")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))));
	}

	@Test
	void saccoUserCanCreateUserOnlyInOwnTenant() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String email = "new-staff-" + System.currentTimeMillis() + "@greenvalley.local";

		mockMvc.perform(post("/api/v1/users")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "fullName": "New Green Staff",
								  "email": "%s",
								  "phone": "+256700111222",
								  "password": "Staff@12345"
								}
								""".formatted(email)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.email", is(email)))
				.andExpect(jsonPath("$.data.passwordHash").doesNotExist());

		mockMvc.perform(post("/api/v1/users")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_lake",
								  "fullName": "Lake Staff",
								  "email": "lake-staff-%s@example.local",
								  "password": "Staff@12345"
								}
								""".formatted(System.currentTimeMillis())))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));
	}

	@Test
	void duplicateUserEmailInTenantIsRejected() throws Exception {
		String token = loginAndReturnToken();

		mockMvc.perform(post("/api/v1/users")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_green",
								  "fullName": "Duplicate Green Admin",
								  "email": "admin@greenvalley.local",
								  "password": "Staff@12345"
								}
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("USER_EXISTS")));
	}

	@Test
	void auditEventsCanBeCreatedAndListedWithTenantScope() throws Exception {
		String platformToken = loginAndReturnToken();
		String saccoToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String action = "Smoke audit " + System.currentTimeMillis();

		mockMvc.perform(post("/api/v1/audit-events")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_green",
								  "action": "%s",
								  "resourceType": "test",
								  "resourceId": "audit-smoke"
								}
								""".formatted(action)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.actorUserId", is("user_platform_admin")))
				.andExpect(jsonPath("$.data.action", is(action)));

		mockMvc.perform(get("/api/v1/audit-events")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))));
	}

	@Test
	void saccoUserCannotWriteAuditForAnotherTenant() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		mockMvc.perform(post("/api/v1/audit-events")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_lake",
								  "action": "Cross tenant audit attempt"
								}
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));
	}

	@Test
	void creatingUserWritesAuditEvent() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String email = "audited-staff-" + System.currentTimeMillis() + "@greenvalley.local";

		MvcResult createdUser = mockMvc.perform(post("/api/v1/users")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "fullName": "Audited Green Staff",
								  "email": "%s",
								  "password": "Staff@12345"
								}
								""".formatted(email)))
				.andExpect(status().isCreated())
				.andReturn();

		String userId = objectMapper.readTree(createdUser.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(get("/api/v1/audit-events")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].action", is("Created user " + email)))
				.andExpect(jsonPath("$.data[0].resourceType", is("user")))
				.andExpect(jsonPath("$.data[0].resourceId", is(userId)));
	}

	@Test
	void branchesAreListedWithTenantScope() throws Exception {
		String platformToken = loginAndReturnToken();
		String saccoToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		mockMvc.perform(get("/api/v1/branches")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(3)));

		mockMvc.perform(get("/api/v1/branches")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(2)))
				.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))));

		mockMvc.perform(get("/api/v1/branches?tenantId=tenant_lake")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));
	}

	@Test
	void saccoUserCanCreateOwnBranchAndAuditIsWritten() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String code = "SM" + System.currentTimeMillis();

		MvcResult createdBranch = mockMvc.perform(post("/api/v1/branches")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "code": "%s",
								  "name": "Smoke Branch",
								  "address": "Smoke Road"
								}
								""".formatted(code)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.code", is(code)))
				.andExpect(jsonPath("$.data.status", is("active")))
				.andReturn();

		String branchId = objectMapper.readTree(createdBranch.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(get("/api/v1/audit-events")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].action", is("Created branch " + code)))
				.andExpect(jsonPath("$.data[0].resourceType", is("branch")))
				.andExpect(jsonPath("$.data[0].resourceId", is(branchId)));
	}

	@Test
	void duplicateBranchCodeIsRejected() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		mockMvc.perform(post("/api/v1/branches")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "code": "GV001",
								  "name": "Duplicate Main"
								}
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("BRANCH_EXISTS")));
	}

	@Test
	void saccoUserCannotCreateBranchInAnotherTenant() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		mockMvc.perform(post("/api/v1/branches")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_lake",
								  "code": "DENIED",
								  "name": "Denied Branch"
								}
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));
	}

	@Test
	void membersAreListedAndFetchedWithTenantScope() throws Exception {
		String platformToken = loginAndReturnToken();
		String saccoToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		mockMvc.perform(get("/api/v1/members")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(3)))
				.andExpect(jsonPath("$.data[0].passwordHash").doesNotExist());

		mockMvc.perform(get("/api/v1/members")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(2)))
				.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))));

		mockMvc.perform(get("/api/v1/members/member_green_amina")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.membershipNo", is("GVS-0001")))
				.andExpect(jsonPath("$.data.savingsBalance", is(2450000.00)));

		mockMvc.perform(get("/api/v1/members/member_lake_peter")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));
	}

	@Test
	void saccoUserCanRegisterOwnMemberAndAuditIsWritten() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String membershipNo = "GVS-SM-" + System.currentTimeMillis();

		MvcResult createdMember = mockMvc.perform(post("/api/v1/members")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "branchId": "branch_green_main",
								  "membershipNo": "%s",
								  "fullName": "Smoke Member",
								  "phone": "+256700333444",
								  "email": "smoke-member@example.local",
								  "nationalId": "CM1234567SMK",
								  "kycStatus": "verified"
								}
								""".formatted(membershipNo)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.membershipNo", is(membershipNo)))
				.andExpect(jsonPath("$.data.status", is("pending_approval")))
				.andExpect(jsonPath("$.data.kycStatus", is("verified")))
				.andExpect(jsonPath("$.data.savingsBalance", is(0)))
				.andExpect(jsonPath("$.data.passwordHash").doesNotExist())
				.andReturn();

		String memberId = objectMapper.readTree(createdMember.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(get("/api/v1/audit-events")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].action", is("Registered member " + membershipNo)))
				.andExpect(jsonPath("$.data[0].resourceType", is("member")))
				.andExpect(jsonPath("$.data[0].resourceId", is(memberId)));
	}

	@Test
	void memberRegistrationAutoGeneratesMembershipNoAndStatusCanBeUpdated() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		MvcResult createdMember = mockMvc.perform(post("/api/v1/members")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "branchId": "branch_green_main",
								  "fullName": "Generated Number Member",
								  "memberType": "group",
								  "phone": "+256700777888"
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.membershipNo", startsWith("GVS-")))
				.andExpect(jsonPath("$.data.memberType", is("group")))
				.andReturn();

		String memberId = objectMapper.readTree(createdMember.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(patch("/api/v1/members/" + memberId + "/status")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{ "status": "active" }
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status", is("active")));
	}

	@Test
	void memberDocumentsAreListedCreatedAndAudited() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		mockMvc.perform(get("/api/v1/members/member_green_amina/documents")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))))
				.andExpect(jsonPath("$.data[0].documentType", is("national_id")))
				.andExpect(jsonPath("$.data[0].verificationStatus", is("verified")));

		MvcResult createdDocument = mockMvc.perform(post("/api/v1/members/member_green_amina/documents")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "documentType": "signature",
								  "storageKey": "tenant_green/members/GVS-0001/signature.png"
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.memberId", is("member_green_amina")))
				.andExpect(jsonPath("$.data.documentType", is("signature")))
				.andExpect(jsonPath("$.data.verificationStatus", is("pending_verification")))
				.andExpect(jsonPath("$.data.uploadedByUserId", is("user_green_admin")))
				.andReturn();

		String documentId = objectMapper.readTree(createdDocument.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(get("/api/v1/audit-events")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].resourceType", is("member_document")))
				.andExpect(jsonPath("$.data[0].resourceId", is(documentId)));
	}

	@Test
	void memberDocumentControlsAreEnforced() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String platformToken = loginAndReturnToken();

		mockMvc.perform(get("/api/v1/members/member_lake_peter/documents")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));

		mockMvc.perform(post("/api/v1/members/member_lake_peter/documents")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "documentType": "photo",
								  "storageKey": "tenant_lake/members/LFS-0001/photo.jpg"
								}
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));

		mockMvc.perform(post("/api/v1/members/member_green_amina/documents")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "documentType": "unknown",
								  "storageKey": "tenant_green/members/GVS-0001/unknown.pdf"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_DOCUMENT_TYPE")));

		mockMvc.perform(post("/api/v1/members/member_green_amina/documents")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "documentType": "photo",
								  "storageKey": "tenant_green/members/GVS-0001/photo.jpg",
								  "verificationStatus": "stalled"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_DOCUMENT_STATUS")));

		mockMvc.perform(get("/api/v1/members/member_missing/documents")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.error.code", is("MEMBER_NOT_FOUND")));

		mockMvc.perform(get("/api/v1/members/member_green_amina/documents")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].memberId", everyItem(is("member_green_amina"))));
	}

	@Test
	void memberContactsAndBeneficiariesAreListedCreatedAndAudited() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		mockMvc.perform(get("/api/v1/members/member_green_amina/next-of-kin")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))))
				.andExpect(jsonPath("$.data[0].memberId", is("member_green_amina")));

		MvcResult createdKin = mockMvc.perform(post("/api/v1/members/member_green_amina/next-of-kin")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "fullName": "Grace Nambi",
								  "relationship": "Mother",
								  "phone": "+256703333444",
								  "address": "Kireka",
								  "primaryContact": true
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.memberId", is("member_green_amina")))
				.andExpect(jsonPath("$.data.relationship", is("mother")))
				.andExpect(jsonPath("$.data.primaryContact", is(true)))
				.andExpect(jsonPath("$.data.createdByUserId", is("user_green_admin")))
				.andReturn();

		String kinId = objectMapper.readTree(createdKin.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(get("/api/v1/members/member_green_amina/beneficiaries")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data[0].memberId", is("member_green_amina")));

		MvcResult createdBeneficiary = mockMvc.perform(post("/api/v1/members/member_green_amina/beneficiaries")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "fullName": "Eva Nakato",
								  "relationship": "Daughter",
								  "phone": "+256704444555",
								  "allocationPercent": 40
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.memberId", is("member_green_amina")))
				.andExpect(jsonPath("$.data.relationship", is("daughter")))
				.andExpect(jsonPath("$.data.allocationPercent", is(40.0)))
				.andReturn();

		String beneficiaryId = objectMapper.readTree(createdBeneficiary.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(get("/api/v1/audit-events")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].resourceId", hasItem(beneficiaryId)))
				.andExpect(jsonPath("$.data[*].resourceId", hasItem(kinId)));
	}

	@Test
	void memberContactAndBeneficiaryControlsAreEnforced() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String platformToken = loginAndReturnToken();

		mockMvc.perform(get("/api/v1/members/member_lake_peter/next-of-kin")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));

		mockMvc.perform(post("/api/v1/members/member_lake_peter/beneficiaries")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "fullName": "Denied Beneficiary",
								  "relationship": "spouse",
								  "allocationPercent": 10
								}
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));

		mockMvc.perform(post("/api/v1/members/member_green_amina/beneficiaries")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "fullName": "Too Much Allocation",
								  "relationship": "brother",
								  "allocationPercent": 41
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("ALLOCATION_EXCEEDED")));

		mockMvc.perform(post("/api/v1/members/member_green_daniel/beneficiaries")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "fullName": "Zero Allocation",
								  "relationship": "sister",
								  "allocationPercent": 0
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_ALLOCATION")));

		mockMvc.perform(get("/api/v1/members/member_missing/beneficiaries")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.error.code", is("MEMBER_NOT_FOUND")));

		mockMvc.perform(get("/api/v1/members/member_green_amina/beneficiaries")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].memberId", everyItem(is("member_green_amina"))));
	}

	@Test
	void invalidOrDuplicateMemberRegistrationIsRejected() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		mockMvc.perform(post("/api/v1/members")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "branchId": "branch_lake_main",
								  "fullName": "Wrong Branch",
								  "phone": "+256700999000"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_BRANCH")));

		mockMvc.perform(post("/api/v1/members")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "branchId": "branch_green_main",
								  "membershipNo": "GVS-0001",
								  "fullName": "Duplicate Member",
								  "phone": "+256700999001"
								}
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("MEMBER_EXISTS")));

		mockMvc.perform(post("/api/v1/members")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_lake",
								  "branchId": "branch_lake_main",
								  "fullName": "Denied Member",
								  "phone": "+256700999002"
								}
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));
	}

	@Test
	void memberImportTemplateUsesTenantScopedDefaults() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String platformToken = loginAndReturnToken();

		mockMvc.perform(get("/api/v1/members/import-template")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.filename", is("member-import-template-tenant_green.csv")))
				.andExpect(jsonPath("$.data.contentType", is("text/csv")))
				.andExpect(jsonPath("$.data.headers.length()", is(10)))
				.andExpect(jsonPath("$.data.headers[0]", is("membershipNo")))
				.andExpect(jsonPath("$.data.headers", hasItem("branchId")))
				.andExpect(jsonPath("$.data.sampleRows[0].branchId", is("branch_green_main")))
				.andExpect(jsonPath("$.data.sampleRows[0].membershipNo", startsWith("GVS-")))
				.andExpect(jsonPath("$.data.csv", startsWith("membershipNo,branchId,fullName")));

		mockMvc.perform(get("/api/v1/members/import-template?tenantId=tenant_lake")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));

		mockMvc.perform(get("/api/v1/members/import-template?tenantId=tenant_lake")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_lake")))
				.andExpect(jsonPath("$.data.sampleRows[0].branchId", is("branch_lake_main")))
				.andExpect(jsonPath("$.data.sampleRows[0].membershipNo", startsWith("LFS-")));
	}

	@Test
	void memberImportValidatesAndCreatesTenantScopedMembers() throws Exception {
		String platformToken = loginAndReturnToken();
		String runId = String.valueOf(System.currentTimeMillis());
		String membershipNo = "IMP-" + runId;
		MvcResult createdTenant = mockMvc.perform(post("/api/v1/tenants")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "name": "Import Test SACCO",
								  "abbreviation": "ITS",
								  "registrationNo": "COOP-IMP-%s",
								  "district": "Kampala",
								  "licenseExpiry": "2027-12-31",
								  "packageId": "starter"
								}
								""".formatted(runId)))
				.andExpect(status().isCreated())
				.andReturn();
		String tenantId = objectMapper.readTree(createdTenant.getResponse().getContentAsString()).path("data").path("id").asString();

		MvcResult createdBranch = mockMvc.perform(post("/api/v1/branches")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "%s",
								  "code": "MAIN",
								  "name": "Main Branch",
								  "address": "Import Road"
								}
								""".formatted(tenantId)))
				.andExpect(status().isCreated())
				.andReturn();
		String branchId = objectMapper.readTree(createdBranch.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(post("/api/v1/members/import")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "%s",
								  "dryRun": true,
								  "rows": [
								    {
								      "membershipNo": "%s",
								      "branchId": "%s",
								      "fullName": "Import Pilot Member",
								      "memberType": "individual",
								      "phone": "+256700555101",
								      "email": "import.pilot@example.local",
								      "nationalId": "CMIMP555101",
								      "kycStatus": "verified",
								      "joiningDate": "2026-07-18",
								      "password": "Member@12345"
								    }
								  ]
								}
								""".formatted(tenantId, membershipNo, branchId)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.valid", is(true)))
				.andExpect(jsonPath("$.data.dryRun", is(true)))
				.andExpect(jsonPath("$.data.totalRows", is(1)))
				.andExpect(jsonPath("$.data.createdCount", is(0)));

		mockMvc.perform(post("/api/v1/members/import")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "%s",
								  "dryRun": false,
								  "rows": [
								    {
								      "membershipNo": "%s",
								      "branchId": "%s",
								      "fullName": "Import Pilot Member",
								      "memberType": "individual",
								      "phone": "+256700555101",
								      "email": "import.pilot@example.local",
								      "nationalId": "CMIMP555101",
								      "kycStatus": "verified",
								      "joiningDate": "2026-07-18",
								      "password": "Member@12345"
								    }
								  ]
								}
								""".formatted(tenantId, membershipNo, branchId)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.valid", is(true)))
				.andExpect(jsonPath("$.data.createdCount", is(1)))
				.andExpect(jsonPath("$.data.createdMembers[0].membershipNo", is(membershipNo)))
				.andExpect(jsonPath("$.data.createdMembers[0].status", is("pending_approval")))
				.andExpect(jsonPath("$.data.createdMembers[0].tenantId", is(tenantId)));

		mockMvc.perform(get("/api/v1/members?tenantId=" + tenantId)
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].membershipNo", hasItem(membershipNo)));

		mockMvc.perform(post("/api/v1/members/import")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "%s",
								  "dryRun": false,
								  "rows": [
								    {
								      "membershipNo": "%s",
								      "branchId": "%s",
								      "fullName": "Duplicate Import Member",
								      "phone": "+256700555102",
								      "password": "Member@12345"
								    }
								  ]
								}
								""".formatted(tenantId, membershipNo, branchId)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.valid", is(false)))
				.andExpect(jsonPath("$.data.createdCount", is(0)))
				.andExpect(jsonPath("$.data.errors[0].code", is("MEMBER_EXISTS")));
	}

	@Test
	void memberImportRejectsInvalidRowsAndCrossTenantAccess() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String platformToken = loginAndReturnToken();

		mockMvc.perform(post("/api/v1/members/import")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_lake",
								  "dryRun": true,
								  "rows": [
								    {
								      "membershipNo": "LFS-DENIED",
								      "branchId": "branch_lake_main",
								      "fullName": "Denied Import Member",
								      "phone": "+256700555201",
								      "password": "Member@12345"
								    }
								  ]
								}
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));

		mockMvc.perform(post("/api/v1/members/import")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_lake",
								  "dryRun": true,
								  "rows": [
								    {
								      "membershipNo": "LFS-BAD-001",
								      "branchId": "branch_green_main",
								      "fullName": "",
								      "memberType": "alien",
								      "phone": "",
								      "kycStatus": "unknown",
								      "password": "short"
								    },
								    {
								      "membershipNo": "LFS-BAD-001",
								      "branchId": "branch_lake_main",
								      "fullName": "Duplicate In File",
								      "phone": "+256700555202",
								      "password": "Member@12345"
								    }
								  ]
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.valid", is(false)))
				.andExpect(jsonPath("$.data.createdCount", is(0)))
				.andExpect(jsonPath("$.data.skippedCount", is(2)))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("INVALID_BRANCH")))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("REQUIRED")))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("INVALID_MEMBER_TYPE")))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("INVALID_KYC_STATUS")))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("PASSWORD_TOO_SHORT")))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("DUPLICATE_IN_FILE")));
	}

	@Test
	void memberMetadataImportTemplatesValidatesAndCreatesProfileRecords() throws Exception {
		String platformToken = loginAndReturnToken();
		String runId = String.valueOf(System.currentTimeMillis());
		String membershipNo = "META-" + runId;
		String tenantId = createTenantForImport(platformToken, "COOP-META-" + runId);
		String branchId = createBranchForImport(platformToken, tenantId);
		String memberId = createImportedMember(platformToken, tenantId, branchId, membershipNo, "+256700666101");

		mockMvc.perform(get("/api/v1/members/metadata-import-template?tenantId=" + tenantId)
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.tenantId", is(tenantId)))
				.andExpect(jsonPath("$.data.headers", hasItem("recordType")))
				.andExpect(jsonPath("$.data.sampleRows[0].membershipNo", is(membershipNo)))
				.andExpect(jsonPath("$.data.csv", startsWith("recordType,membershipNo,fullName")));

		String importPayload = """
				{
				  "tenantId": "%s",
				  "dryRun": %s,
				  "rows": [
				    {
				      "recordType": "kyc_status",
				      "membershipNo": "%s",
				      "kycStatus": "verified"
				    },
				    {
				      "recordType": "document",
				      "membershipNo": "%s",
				      "documentType": "national_id",
				      "storageKey": "kyc/%s/national-id.pdf",
				      "verificationStatus": "verified"
				    },
				    {
				      "recordType": "next_of_kin",
				      "membershipNo": "%s",
				      "fullName": "Metadata Next Of Kin",
				      "relationship": "spouse",
				      "phone": "+256700666201",
				      "address": "Kampala",
				      "primaryContact": "true"
				    },
				    {
				      "recordType": "beneficiary",
				      "membershipNo": "%s",
				      "fullName": "Metadata Beneficiary",
				      "relationship": "daughter",
				      "phone": "+256700666301",
				      "allocationPercent": "60"
				    }
				  ]
				}
				""";

		mockMvc.perform(post("/api/v1/members/metadata-import")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content(importPayload.formatted(tenantId, "true", membershipNo, membershipNo, membershipNo, membershipNo, membershipNo)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.valid", is(true)))
				.andExpect(jsonPath("$.data.createdCount", is(0)));

		mockMvc.perform(post("/api/v1/members/metadata-import")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content(importPayload.formatted(tenantId, "false", membershipNo, membershipNo, membershipNo, membershipNo, membershipNo)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.valid", is(true)))
				.andExpect(jsonPath("$.data.createdCount", is(4)))
				.andExpect(jsonPath("$.data.createdRecords[*].recordType", hasItem("kyc_status")))
				.andExpect(jsonPath("$.data.createdRecords[*].recordType", hasItem("document")))
				.andExpect(jsonPath("$.data.createdRecords[*].recordType", hasItem("next_of_kin")))
				.andExpect(jsonPath("$.data.createdRecords[*].recordType", hasItem("beneficiary")));

		mockMvc.perform(get("/api/v1/members?tenantId=" + tenantId)
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].kycStatus", is("verified")));

		mockMvc.perform(get("/api/v1/members/" + memberId + "/documents")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", is(1)))
				.andExpect(jsonPath("$.data[0].documentType", is("national_id")));

		mockMvc.perform(get("/api/v1/members/" + memberId + "/next-of-kin")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", is(1)))
				.andExpect(jsonPath("$.data[0].primaryContact", is(true)));

		mockMvc.perform(get("/api/v1/members/" + memberId + "/beneficiaries")
				.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", is(1)))
				.andExpect(jsonPath("$.data[0].allocationPercent", is(60.0)));
	}

	@Test
	void memberMetadataImportRejectsInvalidRowsWithoutSaving() throws Exception {
		String platformToken = loginAndReturnToken();
		String runId = String.valueOf(System.currentTimeMillis());
		String membershipNo = "META-BAD-" + runId;
		String tenantId = createTenantForImport(platformToken, "COOP-META-BAD-" + runId);
		String branchId = createBranchForImport(platformToken, tenantId);
		String memberId = createImportedMember(platformToken, tenantId, branchId, membershipNo, "+256700666401");

		mockMvc.perform(post("/api/v1/members/" + memberId + "/beneficiaries")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "fullName": "Existing Beneficiary",
								  "relationship": "son",
								  "phone": "+256700666501",
								  "allocationPercent": 80
								}
								"""))
				.andExpect(status().isCreated());

		mockMvc.perform(post("/api/v1/members/metadata-import")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "%s",
								  "dryRun": false,
								  "rows": [
								    {
								      "recordType": "document",
								      "membershipNo": "%s",
								      "documentType": "passport",
								      "verificationStatus": "unknown"
								    },
								    {
								      "recordType": "next_of_kin",
								      "membershipNo": "%s",
								      "fullName": "Bad Kin",
								      "relationship": "",
								      "phone": "",
								      "primaryContact": "maybe"
								    },
								    {
								      "recordType": "beneficiary",
								      "membershipNo": "%s",
								      "fullName": "Too Much Beneficiary",
								      "relationship": "daughter",
								      "allocationPercent": "30"
								    },
								    {
								      "recordType": "kyc_status",
								      "membershipNo": "MISSING-%s",
								      "kycStatus": "clear"
								    }
								  ]
								}
								""".formatted(tenantId, membershipNo, membershipNo, membershipNo, runId)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.valid", is(false)))
				.andExpect(jsonPath("$.data.createdCount", is(0)))
				.andExpect(jsonPath("$.data.skippedCount", is(4)))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("INVALID_DOCUMENT_TYPE")))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("INVALID_DOCUMENT_STATUS")))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("REQUIRED")))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("INVALID_BOOLEAN")))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("ALLOCATION_EXCEEDED")))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("INVALID_MEMBER")))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("INVALID_KYC_STATUS")));

		mockMvc.perform(get("/api/v1/members/" + memberId + "/documents")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", is(0)));

		mockMvc.perform(get("/api/v1/members/" + memberId + "/next-of-kin")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", is(0)));

		mockMvc.perform(get("/api/v1/members/" + memberId + "/beneficiaries")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", is(1)));
	}

	@Test
	void openingBalanceImportTemplatesValidatesAndPostsLedgerTransactions() throws Exception {
		String platformToken = loginAndReturnToken();
		String runId = String.valueOf(System.currentTimeMillis());
		String membershipNo = "OB-" + runId;
		String tenantId = createTenantForImport(platformToken, "COOP-OB-" + runId);
		String branchId = createBranchForImport(platformToken, tenantId);

		mockMvc.perform(post("/api/v1/members/import")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "%s",
								  "dryRun": false,
								  "rows": [
								    {
								      "membershipNo": "%s",
								      "branchId": "%s",
								      "fullName": "Opening Balance Member",
								      "phone": "+256700777101",
								      "password": "Member@12345"
								    }
								  ]
								}
								""".formatted(tenantId, membershipNo, branchId)))
				.andExpect(status().isCreated());

		mockMvc.perform(get("/api/v1/financial-transactions/opening-balances/import-template?tenantId=" + tenantId)
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.tenantId", is(tenantId)))
				.andExpect(jsonPath("$.data.headers", hasItem("savingsBalance")))
				.andExpect(jsonPath("$.data.sampleRows[0].membershipNo", is(membershipNo)))
				.andExpect(jsonPath("$.data.csv", startsWith("membershipNo,savingsBalance,sharesBalance")));

		mockMvc.perform(post("/api/v1/financial-transactions/opening-balances/import")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "%s",
								  "dryRun": true,
								  "rows": [
								    {
								      "membershipNo": "%s",
								      "savingsBalance": "100000",
								      "sharesBalance": "50000",
								      "welfareBalance": "10000",
								      "reference": "OB-%s",
								      "postingDate": "2026-07-18",
								      "narration": "Opening import test"
								    }
								  ]
								}
								""".formatted(tenantId, membershipNo, runId)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.valid", is(true)))
				.andExpect(jsonPath("$.data.createdCount", is(0)));

		mockMvc.perform(post("/api/v1/financial-transactions/opening-balances/import")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "%s",
								  "dryRun": false,
								  "rows": [
								    {
								      "membershipNo": "%s",
								      "savingsBalance": "100000",
								      "sharesBalance": "50000",
								      "welfareBalance": "10000",
								      "reference": "OB-%s",
								      "postingDate": "2026-07-18",
								      "narration": "Opening import test"
								    }
								  ]
								}
								""".formatted(tenantId, membershipNo, runId)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.valid", is(true)))
				.andExpect(jsonPath("$.data.createdCount", is(3)))
				.andExpect(jsonPath("$.data.createdTransactions[*].status", everyItem(is("posted"))))
				.andExpect(jsonPath("$.data.createdTransactions[*].reference", hasItem("OB-" + runId + "-SAV")));

		MvcResult members = mockMvc.perform(get("/api/v1/members?tenantId=" + tenantId)
				.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].savingsBalance", is(100000.0)))
				.andExpect(jsonPath("$.data[0].sharesBalance", is(50000.0)))
				.andExpect(jsonPath("$.data[0].welfareBalance", is(10000.0)))
				.andReturn();
		String memberId = objectMapper.readTree(members.getResponse().getContentAsString()).path("data").path(0).path("id").asString();

		mockMvc.perform(get("/api/v1/members/" + memberId + "/statement")
				.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.lines.length()", is(3)))
				.andExpect(jsonPath("$.data.closingBalances.savings", is(100000.0)))
				.andExpect(jsonPath("$.data.closingBalances.shares", is(50000.0)))
				.andExpect(jsonPath("$.data.closingBalances.welfare", is(10000.0)));
	}

	@Test
	void openingBalanceImportRejectsInvalidRowsWithoutPosting() throws Exception {
		String platformToken = loginAndReturnToken();
		String runId = String.valueOf(System.currentTimeMillis());
		String membershipNo = "OB-BAD-" + runId;
		String tenantId = createTenantForImport(platformToken, "COOP-OB-BAD-" + runId);
		String branchId = createBranchForImport(platformToken, tenantId);

		mockMvc.perform(post("/api/v1/members/import")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "%s",
								  "dryRun": false,
								  "rows": [
								    {
								      "membershipNo": "%s",
								      "branchId": "%s",
								      "fullName": "Bad Opening Balance Member",
								      "phone": "+256700777201",
								      "password": "Member@12345"
								    }
								  ]
								}
								""".formatted(tenantId, membershipNo, branchId)))
				.andExpect(status().isCreated());

		mockMvc.perform(post("/api/v1/financial-transactions/opening-balances/import")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "%s",
								  "dryRun": false,
								  "rows": [
								    {
								      "membershipNo": "%s",
								      "savingsBalance": "-1",
								      "sharesBalance": "not-money",
								      "welfareBalance": "0",
								      "reference": "OB-BAD-%s",
								      "postingDate": "not-a-date"
								    },
								    {
								      "membershipNo": "%s",
								      "savingsBalance": "0",
								      "sharesBalance": "0",
								      "welfareBalance": "0",
								      "reference": "OB-BAD-%s",
								      "postingDate": "2026-07-18"
								    }
								  ]
								}
								""".formatted(tenantId, membershipNo, runId, membershipNo, runId)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.valid", is(false)))
				.andExpect(jsonPath("$.data.createdCount", is(0)))
				.andExpect(jsonPath("$.data.skippedCount", is(2)))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("NEGATIVE_AMOUNT")))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("INVALID_AMOUNT")))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("INVALID_DATE")))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("DUPLICATE_IN_FILE")))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("NO_OPENING_BALANCE")));

		mockMvc.perform(get("/api/v1/members?tenantId=" + tenantId)
				.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].savingsBalance", is(0.0)))
				.andExpect(jsonPath("$.data[0].sharesBalance", is(0.0)))
				.andExpect(jsonPath("$.data[0].welfareBalance", is(0.0)));
	}

	@Test
	void loanBookImportTemplatesValidatesAndCreatesMigratedLoans() throws Exception {
		String platformToken = loginAndReturnToken();
		String runId = String.valueOf(System.currentTimeMillis());
		String membershipNo = "LN-" + runId;
		String tenantId = createTenantForImport(platformToken, "COOP-LN-" + runId);
		String branchId = createBranchForImport(platformToken, tenantId);
		String memberId = createImportedMember(platformToken, tenantId, branchId, membershipNo, "+256700888101");

		mockMvc.perform(patch("/api/v1/members/" + memberId + "/status")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{ "status": "active" }
								"""))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/v1/loans/import-template?tenantId=" + tenantId)
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.tenantId", is(tenantId)))
				.andExpect(jsonPath("$.data.headers", hasItem("outstandingBalance")))
				.andExpect(jsonPath("$.data.sampleRows[0].membershipNo", is(membershipNo)))
				.andExpect(jsonPath("$.data.csv", startsWith("membershipNo,product,originalAmount")));

		mockMvc.perform(post("/api/v1/loans/import")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "%s",
								  "dryRun": true,
								  "rows": [
								    {
								      "membershipNo": "%s",
								      "product": "Development Loan",
								      "originalAmount": "1200000",
								      "outstandingBalance": "900000",
								      "repaymentMonths": "12",
								      "remainingMonths": "9",
								      "monthlyInstallment": "100000",
								      "disbursedDate": "2026-04-18",
								      "status": "active",
								      "purpose": "Migrated dairy equipment loan"
								    }
								  ]
								}
								""".formatted(tenantId, membershipNo)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.valid", is(true)))
				.andExpect(jsonPath("$.data.createdCount", is(0)));

		mockMvc.perform(post("/api/v1/loans/import")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "%s",
								  "dryRun": false,
								  "rows": [
								    {
								      "membershipNo": "%s",
								      "product": "Development Loan",
								      "originalAmount": "1200000",
								      "outstandingBalance": "900000",
								      "repaymentMonths": "12",
								      "remainingMonths": "9",
								      "monthlyInstallment": "100000",
								      "disbursedDate": "2026-04-18",
								      "status": "active",
								      "purpose": "Migrated dairy equipment loan"
								    }
								  ]
								}
								""".formatted(tenantId, membershipNo)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.valid", is(true)))
				.andExpect(jsonPath("$.data.createdCount", is(1)))
				.andExpect(jsonPath("$.data.createdLoans[0].status", is("active")))
				.andExpect(jsonPath("$.data.createdLoans[0].stage", is("Migrated Active")))
				.andExpect(jsonPath("$.data.createdLoans[0].amount", is(1200000)))
				.andExpect(jsonPath("$.data.createdLoans[0].balance", is(900000)));

		mockMvc.perform(get("/api/v1/loans?tenantId=" + tenantId)
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", is(1)))
				.andExpect(jsonPath("$.data[0].memberId", is(memberId)))
				.andExpect(jsonPath("$.data[0].channel", is("migration")))
				.andExpect(jsonPath("$.data[0].disbursedAt", is("2026-04-18T00:00:00Z")));
	}

	@Test
	void loanBookImportRejectsInvalidRowsWithoutCreatingLoans() throws Exception {
		String platformToken = loginAndReturnToken();
		String runId = String.valueOf(System.currentTimeMillis());
		String membershipNo = "LN-BAD-" + runId;
		String tenantId = createTenantForImport(platformToken, "COOP-LN-BAD-" + runId);
		String branchId = createBranchForImport(platformToken, tenantId);
		createImportedMember(platformToken, tenantId, branchId, membershipNo, "+256700888201");

		mockMvc.perform(post("/api/v1/loans/import")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "%s",
								  "dryRun": false,
								  "rows": [
								    {
								      "membershipNo": "%s",
								      "product": "Unsupported Loan",
								      "originalAmount": "100000",
								      "outstandingBalance": "150000",
								      "repaymentMonths": "0",
								      "remainingMonths": "9",
								      "monthlyInstallment": "1000",
								      "disbursedDate": "not-a-date",
								      "status": "active"
								    },
								    {
								      "membershipNo": "%s",
								      "product": "Unsupported Loan",
								      "originalAmount": "100000",
								      "outstandingBalance": "100000",
								      "repaymentMonths": "12",
								      "remainingMonths": "12",
								      "monthlyInstallment": "1",
								      "disbursedDate": "2026-04-18",
								      "status": "closed"
								    }
								  ]
								}
								""".formatted(tenantId, membershipNo, membershipNo)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.valid", is(false)))
				.andExpect(jsonPath("$.data.createdCount", is(0)))
				.andExpect(jsonPath("$.data.skippedCount", is(2)))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("MEMBER_NOT_ACTIVE")))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("INVALID_LOAN_PRODUCT")))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("BALANCE_EXCEEDS_AMOUNT")))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("INVALID_REPAYMENT_PERIOD")))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("INVALID_REMAINING_PERIOD")))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("INVALID_DATE")))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("DUPLICATE_IN_FILE")))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("SCHEDULE_UNDERFUNDED")))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("CLOSED_LOAN_HAS_BALANCE")));

		mockMvc.perform(get("/api/v1/loans?tenantId=" + tenantId)
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", is(0)));
	}

	@Test
	void repaymentHistoryImportTemplatesValidatesAndCreatesHistoricalRepayments() throws Exception {
		String platformToken = loginAndReturnToken();
		String runId = String.valueOf(System.currentTimeMillis());
		String membershipNo = "LRH-" + runId;
		String tenantId = createTenantForImport(platformToken, "COOP-LRH-" + runId);
		String branchId = createBranchForImport(platformToken, tenantId);
		String memberId = createImportedMember(platformToken, tenantId, branchId, membershipNo, "+256700889101");

		mockMvc.perform(patch("/api/v1/members/" + memberId + "/status")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{ "status": "active" }
								"""))
				.andExpect(status().isOk());

		importLoanForRepaymentHistory(platformToken, tenantId, membershipNo, runId);

		mockMvc.perform(get("/api/v1/loans/repayments/import-template?tenantId=" + tenantId)
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.tenantId", is(tenantId)))
				.andExpect(jsonPath("$.data.headers", hasItem("reference")))
				.andExpect(jsonPath("$.data.sampleRows[0].membershipNo", is(membershipNo)))
				.andExpect(jsonPath("$.data.csv", startsWith("membershipNo,product,loanDisbursedDate")));

		mockMvc.perform(post("/api/v1/loans/repayments/import")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "%s",
								  "dryRun": true,
								  "rows": [
								    {
								      "membershipNo": "%s",
								      "product": "Development Loan",
								      "loanDisbursedDate": "2026-04-18",
								      "amount": "300000",
								      "channel": "bank",
								      "reference": "LRH-%s-001",
								      "receivedDate": "2026-05-18",
								      "narration": "Migrated historical repayment"
								    }
								  ]
								}
								""".formatted(tenantId, membershipNo, runId)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.valid", is(true)))
				.andExpect(jsonPath("$.data.createdCount", is(0)));

		mockMvc.perform(post("/api/v1/loans/repayments/import")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "%s",
								  "dryRun": false,
								  "rows": [
								    {
								      "membershipNo": "%s",
								      "product": "Development Loan",
								      "loanDisbursedDate": "2026-04-18",
								      "amount": "300000",
								      "channel": "bank",
								      "reference": "LRH-%s-001",
								      "receivedDate": "2026-05-18",
								      "narration": "Migrated historical repayment"
								    }
								  ]
								}
								""".formatted(tenantId, membershipNo, runId)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.valid", is(true)))
				.andExpect(jsonPath("$.data.createdCount", is(1)))
				.andExpect(jsonPath("$.data.createdRepayments[0].reference", is("LRH-" + runId + "-001")))
				.andExpect(jsonPath("$.data.createdRepayments[0].receivedAt", is("2026-05-18T00:00:00Z")));

		MvcResult loans = mockMvc.perform(get("/api/v1/loans?tenantId=" + tenantId)
				.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].balance", is(900000.0)))
				.andExpect(jsonPath("$.data[0].repayments", is(1)))
				.andExpect(jsonPath("$.data[0].repaymentTotal", is(300000.0)))
				.andReturn();
		String loanId = objectMapper.readTree(loans.getResponse().getContentAsString()).path("data").path(0).path("id").asString();

		mockMvc.perform(get("/api/v1/loans/" + loanId + "/repayments")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", is(1)))
				.andExpect(jsonPath("$.data[0].reference", is("LRH-" + runId + "-001")));
	}

	@Test
	void repaymentHistoryImportRejectsInvalidRowsWithoutSaving() throws Exception {
		String platformToken = loginAndReturnToken();
		String runId = String.valueOf(System.currentTimeMillis());
		String membershipNo = "LRH-BAD-" + runId;
		String tenantId = createTenantForImport(platformToken, "COOP-LRH-BAD-" + runId);
		String branchId = createBranchForImport(platformToken, tenantId);
		String memberId = createImportedMember(platformToken, tenantId, branchId, membershipNo, "+256700889201");

		mockMvc.perform(patch("/api/v1/members/" + memberId + "/status")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{ "status": "active" }
								"""))
				.andExpect(status().isOk());

		importLoanForRepaymentHistory(platformToken, tenantId, membershipNo, runId);

		mockMvc.perform(post("/api/v1/loans/repayments/import")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "%s",
								  "dryRun": false,
								  "rows": [
								    {
								      "membershipNo": "%s",
								      "product": "Development Loan",
								      "loanDisbursedDate": "bad-date",
								      "amount": "-1",
								      "channel": "card",
								      "reference": "LRH-BAD-%s",
								      "receivedDate": "bad-date"
								    },
								    {
								      "membershipNo": "%s",
								      "product": "Development Loan",
								      "loanDisbursedDate": "2026-04-18",
								      "amount": "400000",
								      "channel": "bank",
								      "reference": "LRH-BAD-%s",
								      "receivedDate": "2026-05-18"
								    }
								  ]
								}
								""".formatted(tenantId, membershipNo, runId, membershipNo, runId)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.valid", is(false)))
				.andExpect(jsonPath("$.data.createdCount", is(0)))
				.andExpect(jsonPath("$.data.skippedCount", is(2)))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("INVALID_DATE")))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("NEGATIVE_AMOUNT")))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("INVALID_REPAYMENT_AMOUNT")))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("INVALID_REPAYMENT_CHANNEL")))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("DUPLICATE_REFERENCE_IN_FILE")))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("REPAYMENT_HISTORY_EXCEEDS_PAID_AMOUNT")));

		mockMvc.perform(get("/api/v1/loans?tenantId=" + tenantId)
				.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].repayments", is(0)))
				.andExpect(jsonPath("$.data[0].repaymentTotal", is(0)));
	}

	@Test
	void activeMemberCanLoginViewProfileAndLogout() throws Exception {
		MvcResult login = mockMvc.perform(post("/api/v1/member-auth/login")
						.contentType("application/json")
						.content("""
								{
								  "identifier": "GVS-0001",
								  "password": "Member@12345"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.token", notNullValue()))
				.andExpect(jsonPath("$.data.member.membershipNo", is("GVS-0001")))
				.andExpect(jsonPath("$.data.member.passwordHash").doesNotExist())
				.andExpect(jsonPath("$.data.tenant.id", is("tenant_green")))
				.andExpect(jsonPath("$.data.branch.id", is("branch_green_main")))
				.andExpect(jsonPath("$.data.balances.savings", is(2450000.00)))
				.andExpect(jsonPath("$.data.balances.shares", is(850000.00)))
				.andExpect(jsonPath("$.data.balances.welfare", is(180000.00)))
				.andReturn();

		String memberToken = objectMapper.readTree(login.getResponse().getContentAsString()).path("data").path("token").asString();

		mockMvc.perform(get("/api/v1/member-auth/me")
						.header("Authorization", "Bearer " + memberToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.member.fullName", is("Amina Nakitende")))
				.andExpect(jsonPath("$.data.balances.savings", is(2450000.00)));

		mockMvc.perform(post("/api/v1/member-auth/logout")
						.header("Authorization", "Bearer " + memberToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.loggedOut", is(true)));

		mockMvc.perform(get("/api/v1/member-auth/me")
						.header("Authorization", "Bearer " + memberToken))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.error.code", is("MEMBER_AUTH_REQUIRED")));
	}

	@Test
	void memberLoginAcceptsPhoneOrEmailIdentifier() throws Exception {
		mockMvc.perform(post("/api/v1/member-auth/login")
						.contentType("application/json")
						.content("""
								{
								  "identifier": "+256772222118",
								  "password": "Member@12345"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.member.membershipNo", is("GVS-0002")));

		mockMvc.perform(post("/api/v1/member-auth/login")
						.contentType("application/json")
						.content("""
								{
								  "identifier": "daniel@example.local",
								  "password": "Member@12345"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.member.membershipNo", is("GVS-0002")));
	}

	@Test
	void memberLoginUsesSaccoCodeScope() throws Exception {
		mockMvc.perform(post("/api/v1/member-auth/login")
						.contentType("application/json")
						.content("""
								{
								  "saccoCode": "GVS",
								  "identifier": "GVS-0001",
								  "password": "Member@12345"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.tenant.id", is("tenant_green")))
				.andExpect(jsonPath("$.data.member.membershipNo", is("GVS-0001")));

		mockMvc.perform(post("/api/v1/member-auth/login")
						.contentType("application/json")
						.content("""
								{
								  "saccoCode": "LFS",
								  "identifier": "GVS-0001",
								  "password": "Member@12345"
								}
								"""))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.error.code", is("INVALID_MEMBER_CREDENTIALS")));
	}

	@Test
	void memberLoginRejectsBadPasswordOrInactiveMember() throws Exception {
		mockMvc.perform(post("/api/v1/member-auth/login")
						.contentType("application/json")
						.content("""
								{
								  "identifier": "GVS-0001",
								  "password": "wrong"
								}
								"""))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.error.code", is("INVALID_MEMBER_CREDENTIALS")));

		mockMvc.perform(post("/api/v1/member-auth/login")
						.contentType("application/json")
						.content("""
								{
								  "identifier": "LFS-0001",
								  "password": "Member@12345"
								}
								"""))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.error.code", is("INVALID_MEMBER_CREDENTIALS")));
	}

	@Test
	void memberMobileDashboardAndLoanSubmissionUseServerConfirmedRecords() throws Exception {
		String memberToken = memberLoginAndReturnToken("GVS-0001", "Member@12345");

		mockMvc.perform(get("/api/v1/member-auth/mobile-dashboard")
						.header("Authorization", "Bearer " + memberToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.member.id", is("member_green_amina")))
				.andExpect(jsonPath("$.data.tenant.id", is("tenant_green")))
				.andExpect(jsonPath("$.data.branch.id", is("branch_green_main")))
				.andExpect(jsonPath("$.data.balances.savings", is(2450000.00)))
				.andExpect(jsonPath("$.data.loans.length()", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data.notifications.length()", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data.serverConfirmed", is(true)));

		MvcResult mobileLoan = mockMvc.perform(post("/api/v1/member-auth/mobile-loans")
						.header("Authorization", "Bearer " + memberToken)
						.contentType("application/json")
						.content("""
								{
								  "product": "Emergency Loan",
								  "amount": 450000,
								  "repaymentMonths": 5,
								  "purpose": "Mobile medical support"
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.memberId", is("member_green_amina")))
				.andExpect(jsonPath("$.data.channel", is("mobile")))
				.andExpect(jsonPath("$.data.submittedByMemberId", is("member_green_amina")))
				.andExpect(jsonPath("$.data.status", is("submitted")))
				.andReturn();
		String loanId = objectMapper.readTree(mobileLoan.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(get("/api/v1/member-auth/mobile-dashboard")
						.header("Authorization", "Bearer " + memberToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.loans[0].id", is(loanId)))
				.andExpect(jsonPath("$.data.notifications[0].eventType", is("loan_application_submitted")))
				.andExpect(jsonPath("$.data.lastUpdatedAt", notNullValue()));

		mockMvc.perform(get("/api/v1/audit-events")
						.header("Authorization", "Bearer " + loginAndReturnToken("admin@greenvalley.local", "Sacco@12345")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].resourceType", is("loan")))
				.andExpect(jsonPath("$.data[0].action", startsWith("Submitted mobile loan application")));
	}

	@Test
	void memberNotificationsAreListedForCurrentMemberOnly() throws Exception {
		String aminaToken = memberLoginAndReturnToken("GVS-0001", "Member@12345");
		String danielToken = memberLoginAndReturnToken("GVS-0002", "Member@12345");

		mockMvc.perform(get("/api/v1/member-auth/notifications")
						.header("Authorization", "Bearer " + aminaToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data[*].memberId", everyItem(is("member_green_amina"))))
				.andExpect(jsonPath("$.data[*].eventType", hasItem("payment_received")));

		mockMvc.perform(get("/api/v1/member-auth/notifications")
						.header("Authorization", "Bearer " + danielToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].memberId", everyItem(is("member_green_daniel"))));
	}

	@Test
	void memberMobileLoanControlsAreEnforced() throws Exception {
		String memberToken = memberLoginAndReturnToken("GVS-0001", "Member@12345");

		mockMvc.perform(get("/api/v1/member-auth/mobile-dashboard"))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.error.code", is("MEMBER_AUTH_REQUIRED")));

		mockMvc.perform(get("/api/v1/member-auth/notifications"))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.error.code", is("MEMBER_AUTH_REQUIRED")));

		mockMvc.perform(post("/api/v1/member-auth/mobile-loans")
						.header("Authorization", "Bearer " + memberToken)
						.contentType("application/json")
						.content("""
								{
								  "product": "Bad Loan",
								  "amount": 100000,
								  "repaymentMonths": 5
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_LOAN_PRODUCT")));

		mockMvc.perform(post("/api/v1/member-auth/mobile-loans")
						.header("Authorization", "Bearer " + memberToken)
						.contentType("application/json")
						.content("""
								{
								  "product": "Emergency Loan",
								  "amount": 0,
								  "repaymentMonths": 5
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_LOAN_AMOUNT")));

		mockMvc.perform(post("/api/v1/member-auth/mobile-loans")
						.header("Authorization", "Bearer " + memberToken)
						.contentType("application/json")
						.content("""
								{
								  "product": "Emergency Loan",
								  "amount": 100000,
								  "repaymentMonths": 61
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_REPAYMENT_PERIOD")));
	}

	@Test
	void financialTransactionsAreListedWithTenantScope() throws Exception {
		String platformToken = loginAndReturnToken();
		String saccoToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		mockMvc.perform(get("/api/v1/financial-transactions")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(3)));

		mockMvc.perform(get("/api/v1/financial-transactions")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(3)))
				.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))));

		mockMvc.perform(get("/api/v1/financial-transactions?tenantId=tenant_lake")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));
	}

	@Test
	void financialProductsAreConfiguredWithTenantScope() throws Exception {
		String platformToken = loginAndReturnToken();
		String saccoToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String code = "GVS-SAV-" + System.currentTimeMillis();

		mockMvc.perform(get("/api/v1/financial-products")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(4)))
				.andExpect(jsonPath("$.data[*].code", hasItem("GVS-SAV-ORD")));

		mockMvc.perform(get("/api/v1/financial-products?type=savings")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))))
				.andExpect(jsonPath("$.data[*].productType", everyItem(is("savings"))));

		MvcResult createdProduct = mockMvc.perform(post("/api/v1/financial-products")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "productType": "savings",
								  "code": "%s",
								  "name": "Youth Savings",
								  "contributionAmount": 20000,
								  "minimumBalance": 5000,
								  "interestRate": 1.5000
								}
								""".formatted(code)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.productType", is("savings")))
				.andExpect(jsonPath("$.data.code", is(code)))
				.andExpect(jsonPath("$.data.status", is("active")))
				.andExpect(jsonPath("$.data.contributionAmount", is(20000)))
				.andReturn();

		String productId = objectMapper.readTree(createdProduct.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(post("/api/v1/financial-products")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "productType": "savings",
								  "code": "%s",
								  "name": "Duplicate Youth Savings",
								  "contributionAmount": 20000,
								  "minimumBalance": 5000,
								  "interestRate": 1.5000
								}
								""".formatted(code)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("FINANCIAL_PRODUCT_EXISTS")));

		mockMvc.perform(get("/api/v1/audit-events")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].resourceType", is("financial_product")))
				.andExpect(jsonPath("$.data[0].resourceId", is(productId)))
				.andExpect(jsonPath("$.data[0].action", is("Created savings product " + code)));
	}

	@Test
	void invalidFinancialProductsAreRejected() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		mockMvc.perform(get("/api/v1/financial-products?tenantId=tenant_lake")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));

		mockMvc.perform(get("/api/v1/financial-products?type=loan")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_PRODUCT_TYPE")));

		mockMvc.perform(post("/api/v1/financial-products")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_lake",
								  "productType": "savings",
								  "code": "LFS-CROSS",
								  "name": "Cross Tenant Savings",
								  "contributionAmount": 10000,
								  "minimumBalance": 5000
								}
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));

		mockMvc.perform(post("/api/v1/financial-products")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "productType": "welfare",
								  "code": "GVS-WEL-BAD",
								  "name": "Bad Welfare",
								  "contributionAmount": -1,
								  "minimumBalance": 0
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_PRODUCT_AMOUNT")));
	}

	@Test
	void financialAccountsAreOpenedWithTenantScope() throws Exception {
		String platformToken = loginAndReturnToken();
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String productCode = "GVS-SAV-ACC-" + System.currentTimeMillis();

		mockMvc.perform(get("/api/v1/financial-accounts")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(4)))
				.andExpect(jsonPath("$.data[*].accountNo", hasItem("GVS-SAV-0001")));

		mockMvc.perform(get("/api/v1/financial-accounts?memberId=member_green_amina")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(3)))
				.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))))
				.andExpect(jsonPath("$.data[*].membershipNo", everyItem(is("GVS-0001"))));

		MvcResult product = mockMvc.perform(post("/api/v1/financial-products")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "productType": "savings",
								  "code": "%s",
								  "name": "Youth Account Savings",
								  "contributionAmount": 0,
								  "minimumBalance": 5000,
								  "interestRate": 1.2500
								}
								""".formatted(productCode)))
				.andExpect(status().isCreated())
				.andReturn();
		String productId = objectMapper.readTree(product.getResponse().getContentAsString()).path("data").path("id").asString();

		MvcResult account = mockMvc.perform(post("/api/v1/financial-accounts")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_amina",
								  "productId": "%s",
								  "accountType": "savings"
								}
								""".formatted(productId)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.memberId", is("member_green_amina")))
				.andExpect(jsonPath("$.data.membershipNo", is("GVS-0001")))
				.andExpect(jsonPath("$.data.productId", is(productId)))
				.andExpect(jsonPath("$.data.productCode", is(productCode)))
				.andExpect(jsonPath("$.data.accountType", is("savings")))
				.andExpect(jsonPath("$.data.accountNo", startsWith("GVS-SAV-")))
				.andExpect(jsonPath("$.data.status", is("active")))
				.andReturn();
		String accountId = objectMapper.readTree(account.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(post("/api/v1/financial-accounts")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_amina",
								  "productId": "%s",
								  "accountType": "savings"
								}
								""".formatted(productId)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("FINANCIAL_ACCOUNT_EXISTS")));

		mockMvc.perform(get("/api/v1/audit-events")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].resourceType", is("financial_account")))
				.andExpect(jsonPath("$.data[0].resourceId", is(accountId)))
				.andExpect(jsonPath("$.data[0].action", startsWith("Opened savings account GVS-SAV-")));
	}

	@Test
	void invalidFinancialAccountsAreRejected() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String platformToken = loginAndReturnToken();

		mockMvc.perform(get("/api/v1/financial-accounts?tenantId=tenant_lake")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));

		mockMvc.perform(get("/api/v1/financial-accounts?type=loan")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_ACCOUNT_TYPE")));

		mockMvc.perform(get("/api/v1/financial-accounts?memberId=member_lake_peter")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.error.code", is("MEMBER_NOT_FOUND")));

		mockMvc.perform(post("/api/v1/financial-accounts")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_lake",
								  "memberId": "member_lake_peter",
								  "productId": "product_lake_savings_ordinary",
								  "accountType": "savings"
								}
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));

		mockMvc.perform(post("/api/v1/financial-accounts")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_amina",
								  "productId": "product_green_shares_standard",
								  "accountType": "savings"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("ACCOUNT_PRODUCT_MISMATCH")));

		mockMvc.perform(post("/api/v1/financial-accounts")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_lake",
								  "memberId": "member_lake_peter",
								  "productId": "product_lake_savings_ordinary",
								  "accountType": "savings"
								}
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("MEMBER_NOT_ACTIVE")));

		mockMvc.perform(post("/api/v1/financial-accounts")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_amina",
								  "productId": "missing_product",
								  "accountType": "savings"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_FINANCIAL_PRODUCT")));
	}

	@Test
	void welfareClaimsAreApprovedPaidAndJournaled() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String reference = "GVS-WCL-SMOKE-" + System.currentTimeMillis();

		mockMvc.perform(get("/api/v1/welfare-claims")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))));

		MvcResult claim = mockMvc.perform(post("/api/v1/welfare-claims")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_daniel",
								  "claimType": "medical",
								  "amount": 10000,
								  "reference": "%s",
								  "description": "Clinic support"
								}
								""".formatted(reference)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.memberId", is("member_green_daniel")))
				.andExpect(jsonPath("$.data.membershipNo", is("GVS-0002")))
				.andExpect(jsonPath("$.data.status", is("submitted")))
				.andExpect(jsonPath("$.data.reference", is(reference)))
				.andReturn();
		String claimId = objectMapper.readTree(claim.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(patch("/api/v1/welfare-claims/" + claimId + "/status")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{ "status": "approved" }
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status", is("approved")))
				.andExpect(jsonPath("$.data.decidedByUserId", is("user_green_admin")));

		mockMvc.perform(post("/api/v1/welfare-claims/" + claimId + "/payment")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{ "channel": "cash" }
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status", is("paid")))
				.andExpect(jsonPath("$.data.channel", is("cash")))
				.andExpect(jsonPath("$.data.paidByUserId", is("user_green_admin")))
				.andExpect(jsonPath("$.data.paidAt", notNullValue()));

		mockMvc.perform(get("/api/v1/members/member_green_daniel")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.welfareBalance", is(85000.00)));

		mockMvc.perform(get("/api/v1/journal-entries")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[?(@.sourceId == '%s')].sourceType".formatted(claimId), hasItem("welfare_claim")))
				.andExpect(jsonPath("$.data[?(@.sourceId == '%s')].isBalanced".formatted(claimId), hasItem(true)));

		mockMvc.perform(post("/api/v1/welfare-claims/" + claimId + "/payment")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{ "channel": "cash" }
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("WELFARE_CLAIM_NOT_PAYABLE")));
	}

	@Test
	void invalidWelfareClaimsAreRejected() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		mockMvc.perform(get("/api/v1/welfare-claims?tenantId=tenant_lake")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));

		mockMvc.perform(post("/api/v1/welfare-claims")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_lake",
								  "memberId": "member_lake_peter",
								  "claimType": "medical",
								  "amount": 10000
								}
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));

		mockMvc.perform(post("/api/v1/welfare-claims")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_amina",
								  "claimType": "medical",
								  "amount": 0
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_WELFARE_CLAIM_AMOUNT")));

		mockMvc.perform(post("/api/v1/welfare-claims")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_amina",
								  "claimType": "medical",
								  "amount": 10000,
								  "reference": "GVS-WCL-0001"
								}
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("WELFARE_CLAIM_REFERENCE_EXISTS")));

		MvcResult claim = mockMvc.perform(post("/api/v1/welfare-claims")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_daniel",
								  "claimType": "burial",
								  "amount": 1000000,
								  "description": "Too high"
								}
								"""))
				.andExpect(status().isCreated())
				.andReturn();
		String claimId = objectMapper.readTree(claim.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(patch("/api/v1/welfare-claims/" + claimId + "/status")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{ "status": "rejected" }
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("WELFARE_REJECTION_REASON_REQUIRED")));

		mockMvc.perform(patch("/api/v1/welfare-claims/" + claimId + "/status")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{ "status": "approved" }
								"""))
				.andExpect(status().isOk());

		mockMvc.perform(post("/api/v1/welfare-claims/" + claimId + "/payment")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{ "channel": "cash" }
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("INSUFFICIENT_WELFARE")));

		mockMvc.perform(post("/api/v1/welfare-claims/" + claimId + "/payment")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{ "channel": "crypto" }
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_WELFARE_PAYMENT_CHANNEL")));
	}

	@Test
	void financialTransactionPostingUsesMakerCheckerAndUpdatesBalances() throws Exception {
		String makerToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String checkerEmail = "checker-" + System.currentTimeMillis() + "@greenvalley.local";

		MvcResult createdChecker = mockMvc.perform(post("/api/v1/users")
						.header("Authorization", "Bearer " + makerToken)
						.contentType("application/json")
						.content("""
								{
								  "fullName": "Green Checker",
								  "email": "%s",
								  "password": "Checker@12345"
								}
								""".formatted(checkerEmail)))
				.andExpect(status().isCreated())
				.andReturn();
		String checkerUserId = objectMapper.readTree(createdChecker.getResponse().getContentAsString()).path("data").path("id").asString();
		mockMvc.perform(put("/api/v1/users/" + checkerUserId + "/roles")
						.header("Authorization", "Bearer " + makerToken)
						.contentType("application/json")
						.content("""
								{
								  "roleIds": ["role_green_admin"]
								}
								"""))
				.andExpect(status().isOk());

		String checkerToken = loginAndReturnToken(checkerEmail, "Checker@12345");
		String membershipNo = "GVS-TX-" + System.currentTimeMillis();

		MvcResult createdMember = mockMvc.perform(post("/api/v1/members")
						.header("Authorization", "Bearer " + makerToken)
						.contentType("application/json")
						.content("""
								{
								  "branchId": "branch_green_main",
								  "membershipNo": "%s",
								  "fullName": "Transaction Member",
								  "phone": "+256701111333"
								}
								""".formatted(membershipNo)))
				.andExpect(status().isCreated())
				.andReturn();

		String memberId = objectMapper.readTree(createdMember.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(patch("/api/v1/members/" + memberId + "/status")
						.header("Authorization", "Bearer " + makerToken)
						.contentType("application/json")
						.content("""
								{ "status": "active" }
								"""))
				.andExpect(status().isOk());

		MvcResult createdTransaction = mockMvc.perform(post("/api/v1/financial-transactions")
						.header("Authorization", "Bearer " + makerToken)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "%s",
								  "type": "savings_deposit",
								  "channel": "cash",
								  "amount": 125000,
								  "narration": "Opening savings"
								}
								""".formatted(memberId)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.status", is("pending_approval")))
				.andExpect(jsonPath("$.data.reference", startsWith("GVS-TX-")))
				.andReturn();

		String transactionId = objectMapper.readTree(createdTransaction.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(patch("/api/v1/financial-transactions/" + transactionId + "/status")
						.header("Authorization", "Bearer " + makerToken)
						.contentType("application/json")
						.content("""
								{ "status": "posted" }
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("MAKER_CHECKER_REQUIRED")));

		mockMvc.perform(patch("/api/v1/financial-transactions/" + transactionId + "/status")
						.header("Authorization", "Bearer " + checkerToken)
						.contentType("application/json")
						.content("""
								{ "status": "posted" }
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status", is("posted")))
				.andExpect(jsonPath("$.data.checkerUserId", notNullValue()))
				.andExpect(jsonPath("$.data.postedAt", notNullValue()));

		mockMvc.perform(get("/api/v1/financial-transactions/" + transactionId + "/receipt")
						.header("Authorization", "Bearer " + makerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.receiptNo", startsWith("RCT-GVS-TX-")))
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.tenantName", is("Green Valley SACCO")))
				.andExpect(jsonPath("$.data.branchName", is("Mukono Main")))
				.andExpect(jsonPath("$.data.memberId", is(memberId)))
				.andExpect(jsonPath("$.data.membershipNo", is(membershipNo)))
				.andExpect(jsonPath("$.data.transactionId", is(transactionId)))
				.andExpect(jsonPath("$.data.amount", is(125000.00)))
				.andExpect(jsonPath("$.data.postedByUserId", notNullValue()))
				.andExpect(jsonPath("$.data.issuedAt", notNullValue()))
				.andExpect(jsonPath("$.data.printableText", startsWith("Green Valley SACCO")));

		mockMvc.perform(get("/api/v1/members/" + memberId)
				.header("Authorization", "Bearer " + makerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.savingsBalance", is(125000.00)))
				.andExpect(jsonPath("$.data.sharesBalance", is(0.00)))
				.andExpect(jsonPath("$.data.welfareBalance", is(0.00)));

		mockMvc.perform(get("/api/v1/members/" + memberId + "/statement")
						.header("Authorization", "Bearer " + makerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.memberId", is(memberId)))
				.andExpect(jsonPath("$.data.openingBalances.savings", is(0.00)))
				.andExpect(jsonPath("$.data.closingBalances.savings", is(125000.00)))
				.andExpect(jsonPath("$.data.lines.length()", is(1)))
				.andExpect(jsonPath("$.data.lines[0].transactionId", is(transactionId)))
				.andExpect(jsonPath("$.data.lines[0].savingsMovement", is(125000.00)))
				.andExpect(jsonPath("$.data.csv", startsWith("membershipNo,memberName,reference")));

		MvcResult reversal = mockMvc.perform(post("/api/v1/financial-transactions/" + transactionId + "/reversal")
						.header("Authorization", "Bearer " + checkerToken)
						.contentType("application/json")
						.content("""
								{ "reason": "Duplicate opening payment" }
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.status", is("posted")))
				.andExpect(jsonPath("$.data.reference", startsWith("GVS-TX-")))
				.andExpect(jsonPath("$.data.reference", is(objectMapper.readTree(createdTransaction.getResponse().getContentAsString()).path("data").path("reference").asString() + "-REV")))
				.andExpect(jsonPath("$.data.originalTransactionId", is(transactionId)))
				.andExpect(jsonPath("$.data.reversalReason", is("Duplicate opening payment")))
				.andReturn();

		String reversalId = objectMapper.readTree(reversal.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(get("/api/v1/members/" + memberId + "/statement")
						.header("Authorization", "Bearer " + makerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.closingBalances.savings", is(0.00)))
				.andExpect(jsonPath("$.data.lines.length()", is(2)))
				.andExpect(jsonPath("$.data.lines[1].transactionId", is(reversalId)))
				.andExpect(jsonPath("$.data.lines[1].amount", is(-125000.00)))
				.andExpect(jsonPath("$.data.lines[1].savingsMovement", is(-125000.00)))
				.andExpect(jsonPath("$.data.lines[1].originalTransactionId", is(transactionId)));

		MvcResult reversalJournals = mockMvc.perform(get("/api/v1/journal-entries")
						.header("Authorization", "Bearer " + makerToken))
				.andExpect(status().isOk())
				.andReturn();
		JsonNode reversalJournal = journalByReference(
				objectMapper.readTree(reversalJournals.getResponse().getContentAsString()).path("data"),
				objectMapper.readTree(reversal.getResponse().getContentAsString()).path("data").path("reference").asString(),
				"financial_transaction_reversal");
		org.junit.jupiter.api.Assertions.assertTrue(reversalJournal.path("isBalanced").asBoolean());
		org.junit.jupiter.api.Assertions.assertEquals(125000.0, reversalJournal.path("debitTotal").asDouble(), 0.01);
		org.junit.jupiter.api.Assertions.assertEquals(125000.0, reversalJournal.path("creditTotal").asDouble(), 0.01);

		mockMvc.perform(get("/api/v1/members/" + memberId)
						.header("Authorization", "Bearer " + makerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.savingsBalance", is(0.00)));

		mockMvc.perform(post("/api/v1/financial-transactions/" + transactionId + "/reversal")
						.header("Authorization", "Bearer " + checkerToken)
						.contentType("application/json")
						.content("""
								{ "reason": "Second reversal attempt" }
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("TRANSACTION_ALREADY_REVERSED")));
	}

	@Test
	void invalidFinancialTransactionsAreRejected() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		mockMvc.perform(get("/api/v1/financial-transactions/txn_green_0001/receipt")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.receiptNo", is("RCT-GVS-TX-0001")))
				.andExpect(jsonPath("$.data.memberName", is("Amina Nakitende")));

		mockMvc.perform(get("/api/v1/financial-transactions/txn_green_0003/receipt")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("RECEIPT_NOT_AVAILABLE")));

		mockMvc.perform(get("/api/v1/financial-transactions/txn_missing/receipt")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.error.code", is("TRANSACTION_NOT_FOUND")));

		mockMvc.perform(post("/api/v1/financial-transactions/txn_green_0003/reversal")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{ "reason": "Cannot reverse pending" }
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("REVERSAL_NOT_AVAILABLE")));

		mockMvc.perform(get("/api/v1/members/member_green_amina/statement?from=2026-08-01&to=2026-07-01")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_STATEMENT_RANGE")));

		mockMvc.perform(post("/api/v1/financial-transactions")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_lake",
								  "memberId": "member_lake_peter",
								  "type": "savings_deposit",
								  "channel": "cash",
								  "amount": 10000
								}
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));

		mockMvc.perform(post("/api/v1/financial-transactions")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_amina",
								  "type": "bad_type",
								  "channel": "cash",
								  "amount": 10000
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_TRANSACTION_TYPE")));

		mockMvc.perform(post("/api/v1/financial-transactions")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_amina",
								  "type": "savings_deposit",
								  "channel": "cash",
								  "amount": 0
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_TRANSACTION_AMOUNT")));
	}

	@Test
	void chartOfAccountsAndJournalEntriesAreAvailable() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		mockMvc.perform(get("/api/v1/chart-of-accounts")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(17)))
				.andExpect(jsonPath("$.data[0].code", is("1000")))
				.andExpect(jsonPath("$.data[0].name", is("Cash on Hand")))
				.andExpect(jsonPath("$.data[0].normalBalance", is("debit")));

		MvcResult journals = mockMvc.perform(get("/api/v1/journal-entries")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(5)))
				.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))))
				.andExpect(jsonPath("$.data[*].isBalanced", everyItem(is(true))))
				.andReturn();

		JsonNode journalData = objectMapper.readTree(journals.getResponse().getContentAsString()).path("data");
		org.junit.jupiter.api.Assertions.assertTrue(hasJournalSource(journalData, "financial_transaction"));
		org.junit.jupiter.api.Assertions.assertTrue(hasJournalSource(journalData, "loan_disbursement"));
		org.junit.jupiter.api.Assertions.assertTrue(hasJournalSource(journalData, "loan_repayment"));
		org.junit.jupiter.api.Assertions.assertTrue(hasJournalSource(journalData, "expense"));
		org.junit.jupiter.api.Assertions.assertTrue(hasJournalSource(journalData, "asset_acquisition"));
		org.junit.jupiter.api.Assertions.assertTrue(hasJournalSource(journalData, "asset_depreciation"));
	}

	@Test
	void accountingTenantControlsAreEnforced() throws Exception {
		String saccoToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String platformToken = loginAndReturnToken();

		mockMvc.perform(get("/api/v1/journal-entries?tenantId=tenant_lake")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));

		mockMvc.perform(get("/api/v1/journal-entries?tenantId=tenant_green")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))));

		mockMvc.perform(get("/api/v1/chart-of-accounts"))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.error.code", is("AUTH_REQUIRED")));
	}

	@Test
	void accountingPeriodsCanBeListedAndUpdated() throws Exception {
		String saccoToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		mockMvc.perform(get("/api/v1/accounting-periods")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(2)))
				.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))));

		mockMvc.perform(patch("/api/v1/accounting-periods/period_green_2026_07/status")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{ "status": "closed" }
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status", is("closed")))
				.andExpect(jsonPath("$.data.closedByUserId", is("user_green_admin")))
				.andExpect(jsonPath("$.data.closedAt", notNullValue()));

		mockMvc.perform(patch("/api/v1/accounting-periods/period_green_2026_07/status")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{ "status": "open" }
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status", is("open")))
				.andExpect(jsonPath("$.data.closedByUserId").doesNotExist())
				.andExpect(jsonPath("$.data.closedAt").doesNotExist());
	}

	@Test
	void closedAccountingPeriodsBlockFinancialPosting() throws Exception {
		String makerToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String checkerToken = loginAndReturnToken();

		MvcResult transaction = mockMvc.perform(post("/api/v1/financial-transactions")
						.header("Authorization", "Bearer " + makerToken)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_amina",
								  "type": "savings_deposit",
								  "channel": "cash",
								  "amount": 20000,
								  "narration": "Closed period test"
								}
								"""))
				.andExpect(status().isCreated())
				.andReturn();
		String transactionId = objectMapper.readTree(transaction.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(patch("/api/v1/accounting-periods/period_green_2026_07/status")
						.header("Authorization", "Bearer " + makerToken)
						.contentType("application/json")
						.content("""
								{ "status": "closed" }
								"""))
				.andExpect(status().isOk());

		mockMvc.perform(patch("/api/v1/financial-transactions/" + transactionId + "/status")
						.header("Authorization", "Bearer " + checkerToken)
						.contentType("application/json")
						.content("""
								{ "status": "posted" }
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("ACCOUNTING_PERIOD_CLOSED")));

		mockMvc.perform(patch("/api/v1/accounting-periods/period_green_2026_07/status")
						.header("Authorization", "Bearer " + makerToken)
						.contentType("application/json")
						.content("""
								{ "status": "open" }
								"""))
				.andExpect(status().isOk());

		mockMvc.perform(patch("/api/v1/financial-transactions/" + transactionId + "/status")
						.header("Authorization", "Bearer " + checkerToken)
						.contentType("application/json")
						.content("""
								{ "status": "posted" }
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status", is("posted")));
	}

	@Test
	void accountingPeriodControlsAreEnforced() throws Exception {
		String saccoToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		mockMvc.perform(get("/api/v1/accounting-periods?tenantId=tenant_lake")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));

		mockMvc.perform(patch("/api/v1/accounting-periods/period_green_2026_07/status")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{ "status": "archived" }
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_ACCOUNTING_PERIOD_STATUS")));
	}

	@Test
	void suppliersAndExpensesPostIntoAccounting() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String supplierName = "Smoke Supplier " + System.currentTimeMillis();
		String expenseReference = "EXP-SMOKE-" + System.currentTimeMillis();

		MvcResult supplier = mockMvc.perform(post("/api/v1/suppliers")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "name": "%s",
								  "phone": "+256700444555",
								  "email": "supplier@example.local",
								  "taxId": "TIN-SMOKE"
								}
								""".formatted(supplierName)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.name", is(supplierName)))
				.andExpect(jsonPath("$.data.createdByUserId", is("user_green_admin")))
				.andReturn();
		String supplierId = objectMapper.readTree(supplier.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(get("/api/v1/suppliers")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))));

		mockMvc.perform(post("/api/v1/expenses")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "supplierId": "%s",
								  "accountCode": "5040",
								  "amount": 76000,
								  "channel": "mobile_money",
								  "reference": "%s",
								  "description": "Core banking support",
								  "expenseDate": "2026-08-16"
								}
								""".formatted(supplierId, expenseReference)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.supplierId", is(supplierId)))
				.andExpect(jsonPath("$.data.accountCode", is("5040")))
				.andExpect(jsonPath("$.data.reference", is(expenseReference)))
				.andExpect(jsonPath("$.data.status", is("posted")))
				.andExpect(jsonPath("$.data.recordedByUserId", is("user_green_admin")));

		MvcResult journals = mockMvc.perform(get("/api/v1/journal-entries")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].isBalanced", everyItem(is(true))))
				.andReturn();
		JsonNode journalData = objectMapper.readTree(journals.getResponse().getContentAsString()).path("data");
		org.junit.jupiter.api.Assertions.assertTrue(hasJournalReference(journalData, expenseReference, "expense"));

		mockMvc.perform(get("/api/v1/regulatory-report")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.reports[0].expenseTotal", greaterThanOrEqualTo(256000.0)));
	}

	@Test
	void supplierAndExpenseControlsAreEnforced() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		mockMvc.perform(post("/api/v1/suppliers")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{ "name": "Green Valley Stationery" }
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("SUPPLIER_EXISTS")));

		mockMvc.perform(get("/api/v1/suppliers?tenantId=tenant_lake")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));

		mockMvc.perform(post("/api/v1/expenses")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "accountCode": "1010",
								  "amount": 10000,
								  "channel": "cash",
								  "reference": "BAD-EXP-ACCOUNT"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_EXPENSE_ACCOUNT")));

		mockMvc.perform(post("/api/v1/expenses")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "supplierId": "supplier_lake_utilities",
								  "accountCode": "5000",
								  "amount": 10000,
								  "channel": "cash",
								  "reference": "BAD-EXP-SUPPLIER"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_SUPPLIER")));

		mockMvc.perform(post("/api/v1/expenses")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "accountCode": "5000",
								  "amount": 10000,
								  "channel": "bank",
								  "reference": "BAD-EXP-CLOSED",
								  "expenseDate": "2026-06-15"
								}
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("ACCOUNTING_PERIOD_CLOSED")));
	}

	@Test
	void assetsPostAcquisitionAndDepreciationJournals() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String assetReference = "AST-SMOKE-" + System.currentTimeMillis();

		mockMvc.perform(get("/api/v1/assets")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))))
				.andExpect(jsonPath("$.data[0].netBookValue", greaterThanOrEqualTo(0.0)));

		mockMvc.perform(post("/api/v1/assets")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "name": "Smoke Router",
								  "category": "technology",
								  "assetAccountCode": "1300",
								  "cost": 600000,
								  "salvageValue": 60000,
								  "usefulLifeMonths": 24,
								  "purchaseDate": "2026-08-16",
								  "depreciationStartDate": "2026-08-01",
								  "channel": "bank",
								  "reference": "%s",
								  "location": "Main office"
								}
								""".formatted(assetReference)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.reference", is(assetReference)))
				.andExpect(jsonPath("$.data.status", is("active")))
				.andExpect(jsonPath("$.data.accumulatedDepreciation", is(0)))
				.andExpect(jsonPath("$.data.netBookValue", is(600000)));

		MvcResult journals = mockMvc.perform(get("/api/v1/journal-entries")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].isBalanced", everyItem(is(true))))
				.andReturn();
		JsonNode journalData = objectMapper.readTree(journals.getResponse().getContentAsString()).path("data");
		org.junit.jupiter.api.Assertions.assertTrue(hasJournalReference(journalData, assetReference, "asset_acquisition"));

		mockMvc.perform(get("/api/v1/regulatory-report")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.reports[0].assetCost", greaterThanOrEqualTo(3000000.0)))
				.andExpect(jsonPath("$.data.reports[0].assetNetBookValue", greaterThanOrEqualTo(2500000.0)));
	}

	@Test
	void assetControlsAreEnforced() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		mockMvc.perform(post("/api/v1/assets")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "name": "Bad Category",
								  "category": "software",
								  "assetAccountCode": "1300",
								  "cost": 100000,
								  "usefulLifeMonths": 12,
								  "channel": "bank"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_ASSET_CATEGORY")));

		mockMvc.perform(post("/api/v1/assets")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "name": "Bad Account",
								  "category": "technology",
								  "assetAccountCode": "5000",
								  "cost": 100000,
								  "usefulLifeMonths": 12,
								  "channel": "bank"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_ASSET_ACCOUNT")));

		mockMvc.perform(post("/api/v1/assets")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "name": "Closed Period Asset",
								  "category": "equipment",
								  "assetAccountCode": "1300",
								  "cost": 100000,
								  "usefulLifeMonths": 12,
								  "purchaseDate": "2026-06-15",
								  "channel": "bank",
								  "reference": "AST-CLOSED-TEST"
								}
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("ACCOUNTING_PERIOD_CLOSED")));

		mockMvc.perform(get("/api/v1/assets?tenantId=tenant_lake")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));
	}

	@Test
	void mobileMoneyCallbackPostsMemberContributionAndIsIdempotent() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String externalReference = "MM-SMOKE-" + System.currentTimeMillis();

		MvcResult callback = mockMvc.perform(post("/api/v1/integrations/mobile-money/callback")
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_green",
								  "memberIdentifier": "GVS-0002",
								  "purpose": "share_purchase",
								  "amount": 45000,
								  "externalReference": "%s",
								  "providerPayload": { "phone": "+256700000002" }
								}
								""".formatted(externalReference)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.memberId", is("member_green_daniel")))
				.andExpect(jsonPath("$.data.purpose", is("share_purchase")))
				.andExpect(jsonPath("$.data.provider", is("demo_mobile_money")))
				.andExpect(jsonPath("$.data.status", is("posted")))
				.andExpect(jsonPath("$.data.resourceType", is("financial_transaction")))
				.andExpect(jsonPath("$.data.duplicate", is(false)))
				.andReturn();

		String callbackId = objectMapper.readTree(callback.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(post("/api/v1/integrations/mobile-money/callback")
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_green",
								  "memberIdentifier": "GVS-0002",
								  "purpose": "share_purchase",
								  "amount": 45000,
								  "externalReference": "%s",
								  "provider": "demo_mobile_money"
								}
								""".formatted(externalReference)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.id", is(callbackId)))
				.andExpect(jsonPath("$.data.duplicate", is(true)));

		mockMvc.perform(get("/api/v1/integrations/mobile-money/callbacks")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))));

		mockMvc.perform(get("/api/v1/statement-lines")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(4)));

		mockMvc.perform(get("/api/v1/notifications/deliveries")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(2)))
				.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))))
				.andExpect(jsonPath("$.data[*].provider", hasItem("demo_sms")))
				.andExpect(jsonPath("$.data[*].provider", hasItem("demo_email")))
				.andExpect(jsonPath("$.data[0].status", is("sent")));
	}

	@Test
	void mobileMoneyCallbackPostsLoanRepaymentAndControlsAreEnforced() throws Exception {
		String staffToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String loanId = createApprovedAndDisbursedLoan(staffToken, 160000);
		String externalReference = "MM-LR-" + System.currentTimeMillis();

		mockMvc.perform(post("/api/v1/integrations/mobile-money/callback")
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_green",
								  "memberId": "member_green_amina",
								  "loanId": "%s",
								  "purpose": "loan_repayment",
								  "amount": 60000,
								  "externalReference": "%s",
								  "provider": "demo_mobile_money"
								}
								""".formatted(loanId, externalReference)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.resourceType", is("loan_repayment")))
				.andExpect(jsonPath("$.data.memberId", is("member_green_amina")))
				.andExpect(jsonPath("$.data.status", is("posted")));

		mockMvc.perform(get("/api/v1/loans/" + loanId + "/repayments")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].reference", is(externalReference)))
				.andExpect(jsonPath("$.data[0].channel", is("mobile_money")));

		mockMvc.perform(post("/api/v1/integrations/mobile-money/callback")
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_green",
								  "memberId": "member_green_amina",
								  "purpose": "loan_repayment",
								  "amount": 10000,
								  "externalReference": "MM-LR-MISSING-%s",
								  "provider": "demo_mobile_money"
								}
								""".formatted(System.currentTimeMillis())))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("LOAN_REQUIRED")));

		mockMvc.perform(post("/api/v1/integrations/mobile-money/callback")
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_green",
								  "memberId": "member_green_amina",
								  "purpose": "bad_purpose",
								  "amount": 10000,
								  "externalReference": "MM-BAD-%s",
								  "provider": "demo_mobile_money"
								}
								""".formatted(System.currentTimeMillis())))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_CALLBACK_PURPOSE")));

		mockMvc.perform(get("/api/v1/integrations/mobile-money/callbacks?tenantId=tenant_lake")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));

		mockMvc.perform(get("/api/v1/notifications/deliveries?tenantId=tenant_lake")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));
	}

	@Test
	void notificationTemplatesAreManagedAndAppliedPerTenant() throws Exception {
		String staffToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String eventType = "smoke_template_" + System.currentTimeMillis();

		mockMvc.perform(get("/api/v1/notification-templates")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].eventType", hasItem("payment_received")))
				.andExpect(jsonPath("$.data[*].tenantId", hasItem((String) null)));

		MvcResult createdTemplate = mockMvc.perform(post("/api/v1/notification-templates")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{
								  "eventType": "%s",
								  "channel": "email",
								  "title": "Smoke notification",
								  "body": "Smoke notification body"
								}
								""".formatted(eventType)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.status", is("active")))
				.andReturn();
		String templateId = objectMapper.readTree(createdTemplate.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(patch("/api/v1/notification-templates/" + templateId)
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{
								  "title": "Updated smoke notification",
								  "status": "inactive"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.title", is("Updated smoke notification")))
				.andExpect(jsonPath("$.data.status", is("inactive")));

		mockMvc.perform(post("/api/v1/notification-templates")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{
								  "eventType": "bad template",
								  "channel": "fax",
								  "title": "Bad",
								  "body": "Bad"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("VALIDATION_ERROR")));

		mockMvc.perform(patch("/api/v1/notification-templates/template_payment_received")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("{ \"status\": \"inactive\" }"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PLATFORM_ADMIN_REQUIRED")));

		mockMvc.perform(get("/api/v1/notification-templates?tenantId=tenant_lake")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));

		String customTitle = "Green Valley loan notice " + System.currentTimeMillis();
		mockMvc.perform(post("/api/v1/notification-templates")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{
								  "eventType": "loan_application_submitted",
								  "channel": "in_app",
								  "title": "%s",
								  "body": "Your custom Green Valley loan notice is ready."
								}
								""".formatted(customTitle)))
				.andExpect(status().isCreated());

		String memberToken = memberLoginAndReturnToken("GVS-0001", "Member@12345");
		mockMvc.perform(post("/api/v1/member-auth/mobile-loans")
						.header("Authorization", "Bearer " + memberToken)
						.contentType("application/json")
						.content("""
								{
								  "product": "Emergency Loan",
								  "amount": 180000,
								  "repaymentMonths": 6,
								  "purpose": "Template smoke test"
								}
								"""))
				.andExpect(status().isCreated());

		mockMvc.perform(get("/api/v1/member-auth/notifications")
						.header("Authorization", "Bearer " + memberToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].title", hasItem(customTitle)));
	}

	@Test
	void governanceMeetingsAndResolutionsAreTenantScoped() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String title = "Board Risk Review " + System.currentTimeMillis();

		mockMvc.perform(get("/api/v1/governance-meetings")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))))
				.andExpect(jsonPath("$.data[0].openResolutions", greaterThanOrEqualTo(1)));

		MvcResult createdMeeting = mockMvc.perform(post("/api/v1/governance-meetings")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "title": "%s",
								  "meetingType": "board",
								  "scheduledAt": "2026-08-20T09:00:00Z",
								  "minutes": "Review risk dashboard and controls."
								}
								""".formatted(title)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.title", is(title)))
				.andExpect(jsonPath("$.data.meetingType", is("board")))
				.andExpect(jsonPath("$.data.openResolutions", is(0)))
				.andReturn();
		String meetingId = objectMapper.readTree(createdMeeting.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(post("/api/v1/governance-meetings/" + meetingId + "/resolutions")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "title": "Strengthen arrears review",
								  "decision": "Management to submit weekly arrears movement reports.",
								  "dueDate": "2026-08-31",
								  "status": "open"
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.meetingId", is(meetingId)))
				.andExpect(jsonPath("$.data.status", is("open")));

		mockMvc.perform(get("/api/v1/regulatory-report")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.reports[0].openResolutions", greaterThanOrEqualTo(2)));

		mockMvc.perform(get("/api/v1/audit-events")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].resourceType", is("governance_resolution")));
	}

	@Test
	void governanceControlsAreEnforced() throws Exception {
		String saccoToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String platformToken = loginAndReturnToken();

		mockMvc.perform(get("/api/v1/governance-meetings?tenantId=tenant_lake")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));

		mockMvc.perform(post("/api/v1/governance-meetings")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "title": "Bad Meeting",
								  "meetingType": "picnic"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_MEETING_TYPE")));

		mockMvc.perform(post("/api/v1/governance-meetings/missing-meeting/resolutions")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{ "title": "Missing meeting resolution" }
								"""))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.error.code", is("MEETING_NOT_FOUND")));

		mockMvc.perform(post("/api/v1/governance-meetings/meeting_green_0001/resolutions")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "title": "Bad Status",
								  "status": "stalled"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_RESOLUTION_STATUS")));

		mockMvc.perform(get("/api/v1/governance-meetings?tenantId=tenant_green")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))));
	}

	@Test
	void complaintsCanBeCapturedUpdatedAndSyncedFromMobile() throws Exception {
		String staffToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String subject = "Mobile receipt clarification " + System.currentTimeMillis();

		mockMvc.perform(get("/api/v1/complaints")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))))
				.andExpect(jsonPath("$.data[0].status", is("open")));

		MvcResult createdComplaint = mockMvc.perform(post("/api/v1/complaints")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_amina",
								  "category": "statement",
								  "subject": "%s",
								  "description": "Member says latest receipt is missing from the branch statement.",
								  "channel": "branch",
								  "priority": "high"
								}
								""".formatted(subject)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.memberId", is("member_green_amina")))
				.andExpect(jsonPath("$.data.category", is("statement")))
				.andExpect(jsonPath("$.data.priority", is("high")))
				.andReturn();
		String complaintId = objectMapper.readTree(createdComplaint.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(patch("/api/v1/complaints/" + complaintId + "/status")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{
								  "status": "resolved",
								  "resolutionNotes": "Receipt traced to mobile-money callback batch."
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status", is("resolved")))
				.andExpect(jsonPath("$.data.resolvedByUserId", is("user_green_admin")));

		String memberToken = memberLoginAndReturnToken("GVS-0001", "Member@12345");
		mockMvc.perform(post("/api/v1/member-auth/mobile-complaints")
						.header("Authorization", "Bearer " + memberToken)
						.contentType("application/json")
						.content("""
								{
								  "category": "service",
								  "subject": "Queue follow-up",
								  "description": "Offline draft synced from member mobile app.",
								  "priority": "medium"
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.memberId", is("member_green_amina")))
				.andExpect(jsonPath("$.data.channel", is("mobile_offline_sync")))
				.andExpect(jsonPath("$.data.createdByMemberId", is("member_green_amina")));

		mockMvc.perform(get("/api/v1/regulatory-report")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.reports[0].openComplaints", greaterThanOrEqualTo(2)));

		mockMvc.perform(get("/api/v1/audit-events")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].resourceType", is("complaint")));
	}

	@Test
	void complaintControlsAreEnforced() throws Exception {
		String saccoToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String platformToken = loginAndReturnToken();
		String memberToken = memberLoginAndReturnToken("GVS-0001", "Member@12345");

		mockMvc.perform(get("/api/v1/complaints?tenantId=tenant_lake")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));

		mockMvc.perform(post("/api/v1/complaints")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_lake_peter",
								  "category": "service",
								  "subject": "Wrong SACCO member",
								  "channel": "branch"
								}
								"""))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.error.code", is("MEMBER_NOT_FOUND")));

		mockMvc.perform(post("/api/v1/complaints")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "category": "bad_category",
								  "subject": "Bad category"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_COMPLAINT_CATEGORY")));

		mockMvc.perform(patch("/api/v1/complaints/complaint_green_0001/status")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{ "status": "stalled" }
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_COMPLAINT_STATUS")));

		mockMvc.perform(post("/api/v1/member-auth/mobile-complaints")
						.header("Authorization", "Bearer " + memberToken)
						.contentType("application/json")
						.content("""
								{
								  "category": "bad_category",
								  "subject": "Bad mobile complaint"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_COMPLAINT_CATEGORY")));

		mockMvc.perform(get("/api/v1/complaints?tenantId=tenant_green")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))));
	}

	@Test
	void statementLinesAndReconciliationAreAvailable() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		mockMvc.perform(get("/api/v1/statement-lines")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(3)))
				.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))));

		mockMvc.perform(get("/api/v1/reconciliation")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.summary.statementLines", greaterThanOrEqualTo(3)))
				.andExpect(jsonPath("$.data.summary.ledgerLines", greaterThanOrEqualTo(4)))
				.andExpect(jsonPath("$.data.summary.matched", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data.summary.unmatchedStatementLines", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data.summary.unmatchedLedgerLines", greaterThanOrEqualTo(1)));
	}

	@Test
	void staffCanImportStatementLineAndControlsAreEnforced() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		mockMvc.perform(post("/api/v1/statement-lines")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "channel": "bank",
								  "amount": 125000,
								  "externalReference": "BANK-TEST-001",
								  "description": "Manual bank import",
								  "statementDate": "2026-07-16"
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.accountCode", is("1010")))
				.andExpect(jsonPath("$.data.externalReference", is("BANK-TEST-001")))
				.andExpect(jsonPath("$.data.importedByUserId", is("user_green_admin")));

		mockMvc.perform(post("/api/v1/statement-lines")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "channel": "bank",
								  "amount": 125000,
								  "externalReference": "BANK-TEST-001",
								  "statementDate": "2026-07-16"
								}
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("STATEMENT_LINE_EXISTS")));

		mockMvc.perform(post("/api/v1/statement-lines")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "channel": "bank",
								  "amount": 10000,
								  "externalReference": "BANK-CLOSED-001",
								  "statementDate": "2026-06-15"
								}
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("ACCOUNTING_PERIOD_CLOSED")));

		mockMvc.perform(post("/api/v1/statement-lines")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "channel": "bad_channel",
								  "amount": 10000,
								  "externalReference": "BAD-STATEMENT-001",
								  "statementDate": "2026-07-16"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_STATEMENT_CHANNEL")));
	}

	@Test
	void regulatoryReportSummarizesTenantAndConsolidatedMetrics() throws Exception {
		String saccoToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String platformToken = loginAndReturnToken();

		mockMvc.perform(get("/api/v1/regulatory-report")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.period", notNullValue()))
				.andExpect(jsonPath("$.data.reports.length()", is(1)))
				.andExpect(jsonPath("$.data.reports[0].tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.reports[0].memberCount", greaterThanOrEqualTo(2)))
				.andExpect(jsonPath("$.data.reports[0].activeMembers", greaterThanOrEqualTo(2)))
				.andExpect(jsonPath("$.data.reports[0].savings", greaterThanOrEqualTo(0.0)))
				.andExpect(jsonPath("$.data.reports[0].journalEntries", greaterThanOrEqualTo(4)))
				.andExpect(jsonPath("$.data.reports[0].reconciliationExceptions", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data.consolidated.tenantId", is("consolidated")))
				.andExpect(jsonPath("$.data.csv", startsWith("\"tenant\",\"members\"")));

		mockMvc.perform(get("/api/v1/regulatory-report")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.reports.length()", greaterThanOrEqualTo(2)))
				.andExpect(jsonPath("$.data.consolidated.memberCount", greaterThanOrEqualTo(3)));
	}

	@Test
	void regulatoryReportTenantAccessIsEnforced() throws Exception {
		String saccoToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		mockMvc.perform(get("/api/v1/regulatory-report?tenantId=tenant_lake")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));

		mockMvc.perform(get("/api/v1/regulatory-report"))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.error.code", is("AUTH_REQUIRED")));
	}

	@Test
	void loansAreListedWithTenantScope() throws Exception {
		String platformToken = loginAndReturnToken();
		String saccoToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		mockMvc.perform(get("/api/v1/loans")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(3)));

		mockMvc.perform(get("/api/v1/loans")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(2)))
				.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))));

		mockMvc.perform(get("/api/v1/loans?tenantId=tenant_lake")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));
	}

	@Test
	void saccoUserCanSubmitLoanForActiveMemberAndAuditIsWritten() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		MvcResult createdLoan = mockMvc.perform(post("/api/v1/loans")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_amina",
								  "product": "Development Loan",
								  "amount": 1200000,
								  "repaymentMonths": 12,
								  "purpose": "Stock expansion"
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.memberId", is("member_green_amina")))
				.andExpect(jsonPath("$.data.status", is("submitted")))
				.andExpect(jsonPath("$.data.stage", is("Credit Appraisal")))
				.andExpect(jsonPath("$.data.balance", is(0)))
				.andExpect(jsonPath("$.data.channel", is("staff")))
				.andExpect(jsonPath("$.data.repaymentMonths", is(12)))
				.andReturn();

		String loanId = objectMapper.readTree(createdLoan.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(get("/api/v1/audit-events")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].action", is("Submitted loan application for GVS-0001")))
				.andExpect(jsonPath("$.data[0].resourceType", is("loan")))
				.andExpect(jsonPath("$.data[0].resourceId", is(loanId)));
	}

	@Test
	void invalidLoanApplicationsAreRejected() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		mockMvc.perform(post("/api/v1/loans")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_lake",
								  "memberId": "member_lake_peter",
								  "product": "Agriculture Loan",
								  "amount": 500000,
								  "repaymentMonths": 6
								}
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));

		mockMvc.perform(post("/api/v1/loans")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_amina",
								  "product": "Unsupported Loan",
								  "amount": 500000,
								  "repaymentMonths": 6
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_LOAN_PRODUCT")));

		mockMvc.perform(post("/api/v1/loans")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_amina",
								  "product": "Emergency Loan",
								  "amount": 500000,
								  "repaymentMonths": 0
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_REPAYMENT_PERIOD")));
	}

	@Test
	void guaranteedLoanCanBeApprovedAndDisbursed() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		mockMvc.perform(patch("/api/v1/loans/loan_green_0002/status")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{ "status": "approved" }
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status", is("approved")))
				.andExpect(jsonPath("$.data.stage", is("Ready for Disbursement")))
				.andExpect(jsonPath("$.data.approvedByUserId", is("user_green_admin")))
				.andExpect(jsonPath("$.data.approvedAt", notNullValue()));

		mockMvc.perform(post("/api/v1/loans/loan_green_0002/disburse")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status", is("active")))
				.andExpect(jsonPath("$.data.stage", is("Disbursed")))
				.andExpect(jsonPath("$.data.balance", is(800000.00)))
				.andExpect(jsonPath("$.data.disbursedByUserId", is("user_green_admin")))
				.andExpect(jsonPath("$.data.disbursedAt", notNullValue()));
	}

	@Test
	void loanDecisionControlsAreEnforced() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		mockMvc.perform(post("/api/v1/loans/loan_green_0002/disburse")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("LOAN_NOT_APPROVED")));

		MvcResult createdLoan = mockMvc.perform(post("/api/v1/loans")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_amina",
								  "product": "Emergency Loan",
								  "amount": 250000,
								  "repaymentMonths": 4
								}
								"""))
				.andExpect(status().isCreated())
				.andReturn();

		String loanId = objectMapper.readTree(createdLoan.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(patch("/api/v1/loans/" + loanId + "/status")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{ "status": "approved" }
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("GUARANTOR_REQUIRED")));

		mockMvc.perform(patch("/api/v1/loans/" + loanId + "/status")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{ "status": "rejected", "reason": "Capacity too low" }
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status", is("rejected")))
				.andExpect(jsonPath("$.data.stage", is("Rejected")))
				.andExpect(jsonPath("$.data.rejectionReason", is("Capacity too low")));

		mockMvc.perform(patch("/api/v1/loans/" + loanId + "/status")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{ "status": "rejected" }
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("LOAN_ALREADY_DECIDED")));
	}

	@Test
	void loanRepaymentsReduceBalanceAndCloseLoan() throws Exception {
		String staffToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String loanId = createApprovedAndDisbursedLoan(staffToken, 200000);

		mockMvc.perform(post("/api/v1/loans/" + loanId + "/repayments")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{
								  "amount": 125000,
								  "channel": "cash",
								  "reference": "LR-TEST-001",
								  "narration": "Counter repayment"
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.loanId", is(loanId)))
				.andExpect(jsonPath("$.data.amount", is(125000)))
				.andExpect(jsonPath("$.data.reference", is("LR-TEST-001")))
				.andExpect(jsonPath("$.data.receivedByUserId", is("user_green_admin")))
				.andExpect(jsonPath("$.data.receivedAt", notNullValue()));

		mockMvc.perform(get("/api/v1/loans/" + loanId + "/repayments")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", is(1)))
				.andExpect(jsonPath("$.data[0].reference", is("LR-TEST-001")));

		MvcResult openLoans = mockMvc.perform(get("/api/v1/loans")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andReturn();
		JsonNode openLoan = loanFromList(openLoans, loanId);
		org.junit.jupiter.api.Assertions.assertEquals("active", openLoan.path("status").asString());
		org.junit.jupiter.api.Assertions.assertEquals("Repayment", openLoan.path("stage").asString());
		org.junit.jupiter.api.Assertions.assertEquals(75000.0, openLoan.path("balance").asDouble(), 0.01);
		org.junit.jupiter.api.Assertions.assertEquals(1, openLoan.path("repayments").asInt());
		org.junit.jupiter.api.Assertions.assertEquals(125000.0, openLoan.path("repaymentTotal").asDouble(), 0.01);

		mockMvc.perform(post("/api/v1/loans/" + loanId + "/repayments")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{
								  "amount": 75000,
								  "channel": "mobile_money",
								  "reference": "LR-TEST-002"
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.amount", is(75000)));

		MvcResult loans = mockMvc.perform(get("/api/v1/loans")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andReturn();

		JsonNode closedLoan = loanFromList(loans, loanId);
		org.junit.jupiter.api.Assertions.assertEquals("closed", closedLoan.path("status").asString());
		org.junit.jupiter.api.Assertions.assertEquals("Closed", closedLoan.path("stage").asString());
		org.junit.jupiter.api.Assertions.assertEquals(0.0, closedLoan.path("balance").asDouble(), 0.01);
		org.junit.jupiter.api.Assertions.assertEquals(2, closedLoan.path("repayments").asInt());
		org.junit.jupiter.api.Assertions.assertEquals(200000.0, closedLoan.path("repaymentTotal").asDouble(), 0.01);

		MvcResult repaymentJournals = mockMvc.perform(get("/api/v1/journal-entries")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andReturn();
		JsonNode journalData = objectMapper.readTree(repaymentJournals.getResponse().getContentAsString()).path("data");
		JsonNode firstRepaymentJournal = journalByReference(journalData, "LR-TEST-001", "loan_repayment");
		JsonNode secondRepaymentJournal = journalByReference(journalData, "LR-TEST-002", "loan_repayment");
		org.junit.jupiter.api.Assertions.assertTrue(firstRepaymentJournal.path("isBalanced").asBoolean());
		org.junit.jupiter.api.Assertions.assertTrue(secondRepaymentJournal.path("isBalanced").asBoolean());
		org.junit.jupiter.api.Assertions.assertEquals(125000.0, firstRepaymentJournal.path("debitTotal").asDouble(), 0.01);
		org.junit.jupiter.api.Assertions.assertEquals(75000.0, secondRepaymentJournal.path("debitTotal").asDouble(), 0.01);
	}

	@Test
	void loanRepaymentControlsAreEnforced() throws Exception {
		String staffToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String loanId = createApprovedAndDisbursedLoan(staffToken, 150000);

		mockMvc.perform(post("/api/v1/loans/" + loanId + "/repayments")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{
								  "amount": 50000,
								  "channel": "cash",
								  "reference": "LR-TEST-CTRL-001"
								}
								"""))
				.andExpect(status().isCreated());

		mockMvc.perform(post("/api/v1/loans/" + loanId + "/repayments")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{
								  "amount": 25000,
								  "channel": "cash",
								  "reference": "LR-TEST-CTRL-001"
								}
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("DUPLICATE_REPAYMENT_REFERENCE")));

		mockMvc.perform(post("/api/v1/loans/" + loanId + "/repayments")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{
								  "amount": 999999,
								  "channel": "cash",
								  "reference": "LR-TEST-CTRL-002"
								}
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("REPAYMENT_EXCEEDS_BALANCE")));

		mockMvc.perform(post("/api/v1/loans/" + loanId + "/repayments")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{
								  "amount": 0,
								  "channel": "cash",
								  "reference": "LR-TEST-CTRL-003"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_REPAYMENT_AMOUNT")));

		mockMvc.perform(post("/api/v1/loans/loan_green_0002/repayments")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{
								  "amount": 50000,
								  "channel": "cash",
								  "reference": "LR-TEST-CTRL-004"
								}
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("LOAN_NOT_ACTIVE")));
	}

	@Test
	void staffCanRequestGuarantorAndMemberCanAccept() throws Exception {
		String staffToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		MvcResult createdLoan = mockMvc.perform(post("/api/v1/loans")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_amina",
								  "product": "Emergency Loan",
								  "amount": 300000,
								  "repaymentMonths": 4
								}
								"""))
				.andExpect(status().isCreated())
				.andReturn();

		String loanId = objectMapper.readTree(createdLoan.getResponse().getContentAsString()).path("data").path("id").asString();

		MvcResult guarantor = mockMvc.perform(post("/api/v1/loans/" + loanId + "/guarantors")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_daniel",
								  "guaranteedAmount": 150000
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.loanId", is(loanId)))
				.andExpect(jsonPath("$.data.memberId", is("member_green_daniel")))
				.andExpect(jsonPath("$.data.status", is("pending")))
				.andReturn();

		String guarantorId = objectMapper.readTree(guarantor.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(get("/api/v1/loans/" + loanId + "/guarantors")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", is(1)))
				.andExpect(jsonPath("$.data[0].id", is(guarantorId)));

		String memberToken = memberLoginAndReturnToken("GVS-0002", "Member@12345");

		mockMvc.perform(get("/api/v1/member-auth/guarantor-requests")
						.header("Authorization", "Bearer " + memberToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data[0].loan", notNullValue()))
				.andExpect(jsonPath("$.data[0].capacity", notNullValue()));

		String otherMemberToken = memberLoginAndReturnToken("GVS-0001", "Member@12345");
		mockMvc.perform(patch("/api/v1/member-auth/guarantor-requests/" + guarantorId + "/status")
						.header("Authorization", "Bearer " + otherMemberToken)
						.contentType("application/json")
						.content("""
								{ "status": "accepted" }
								"""))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.error.code", is("GUARANTOR_REQUEST_NOT_FOUND")));

		mockMvc.perform(patch("/api/v1/member-auth/guarantor-requests/" + guarantorId + "/status")
						.header("Authorization", "Bearer " + memberToken)
						.contentType("application/json")
						.content("""
								{ "status": "accepted" }
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status", is("accepted")))
				.andExpect(jsonPath("$.data.decidedAt", notNullValue()));

		mockMvc.perform(patch("/api/v1/loans/" + loanId + "/status")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{ "status": "approved" }
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status", is("approved")))
				.andExpect(jsonPath("$.data.guarantors", is(1)));
	}

	@Test
	void guarantorControlsAreEnforced() throws Exception {
		String staffToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		MvcResult duplicateLoan = mockMvc.perform(post("/api/v1/loans")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_amina",
								  "product": "Emergency Loan",
								  "amount": 250000,
								  "repaymentMonths": 4
								}
								"""))
				.andExpect(status().isCreated())
				.andReturn();

		String duplicateLoanId = objectMapper.readTree(duplicateLoan.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(post("/api/v1/loans/" + duplicateLoanId + "/guarantors")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_daniel",
								  "guaranteedAmount": 100000
								}
								"""))
				.andExpect(status().isCreated());

		mockMvc.perform(post("/api/v1/loans/" + duplicateLoanId + "/guarantors")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_daniel",
								  "guaranteedAmount": 100000
								}
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("GUARANTOR_ALREADY_REQUESTED")));

		MvcResult capacityLoan = mockMvc.perform(post("/api/v1/loans")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_amina",
								  "product": "School Fees Loan",
								  "amount": 250000,
								  "repaymentMonths": 4
								}
								"""))
				.andExpect(status().isCreated())
				.andReturn();

		String capacityLoanId = objectMapper.readTree(capacityLoan.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(post("/api/v1/loans/" + capacityLoanId + "/guarantors")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_daniel",
								  "guaranteedAmount": 999999999
								}
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("GUARANTEE_CAPACITY_EXCEEDED")));

		MvcResult invalidAmountLoan = mockMvc.perform(post("/api/v1/loans")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_amina",
								  "product": "Development Loan",
								  "amount": 250000,
								  "repaymentMonths": 4
								}
								"""))
				.andExpect(status().isCreated())
				.andReturn();

		String invalidAmountLoanId = objectMapper.readTree(invalidAmountLoan.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(post("/api/v1/loans/" + invalidAmountLoanId + "/guarantors")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_daniel",
								  "guaranteedAmount": 0
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_GUARANTEE_AMOUNT")));
	}

	@Test
	void borrowerCannotGuaranteeOwnLoanAndInvalidMemberDecisionIsRejected() throws Exception {
		String staffToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		MvcResult createdLoan = mockMvc.perform(post("/api/v1/loans")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_amina",
								  "product": "Emergency Loan",
								  "amount": 200000,
								  "repaymentMonths": 3
								}
								"""))
				.andExpect(status().isCreated())
				.andReturn();

		String loanId = objectMapper.readTree(createdLoan.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(post("/api/v1/loans/" + loanId + "/guarantors")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_amina",
								  "guaranteedAmount": 100000
								}
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("BORROWER_CANNOT_GUARANTEE")));

		MvcResult guarantor = mockMvc.perform(post("/api/v1/loans/" + loanId + "/guarantors")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_daniel",
								  "guaranteedAmount": 100000
								}
								"""))
				.andExpect(status().isCreated())
				.andReturn();

		String guarantorId = objectMapper.readTree(guarantor.getResponse().getContentAsString()).path("data").path("id").asString();
		String memberToken = memberLoginAndReturnToken("GVS-0002", "Member@12345");

		mockMvc.perform(patch("/api/v1/member-auth/guarantor-requests/" + guarantorId + "/status")
						.header("Authorization", "Bearer " + memberToken)
						.contentType("application/json")
						.content("""
								{ "status": "maybe" }
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_GUARANTOR_STATUS")));
	}

	@Test
	void approvalWorkflowsAndDecisionsAreTenantScopedAndAudited() throws Exception {
		String saccoToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		mockMvc.perform(get("/api/v1/approval-workflows")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(2)))
				.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))));

		MvcResult createdWorkflow = mockMvc.perform(post("/api/v1/approval-workflows")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "name": "Expense approval test",
								  "module": "expenses"
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.module", is("expenses")))
				.andExpect(jsonPath("$.data.active", is(true)))
				.andExpect(jsonPath("$.data.createdByUserId", is("user_green_admin")))
				.andReturn();

		String workflowId = objectMapper.readTree(createdWorkflow.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(post("/api/v1/approval-decisions")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "workflowId": "%s",
								  "resourceType": "expense",
								  "resourceId": "expense_green_0001",
								  "decision": "approved"
								}
								""".formatted(workflowId)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.workflowId", is(workflowId)))
				.andExpect(jsonPath("$.data.decision", is("approved")))
				.andExpect(jsonPath("$.data.decidedByUserId", is("user_green_admin")));

		mockMvc.perform(get("/api/v1/approval-decisions?decision=approved")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data[0].resourceId", is("expense_green_0001")))
				.andExpect(jsonPath("$.data[*].decision", everyItem(is("approved"))));

		mockMvc.perform(get("/api/v1/audit-events")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].resourceType", is("approval_decision")));
	}

	@Test
	void approvalControlsAreEnforced() throws Exception {
		String saccoToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String platformToken = loginAndReturnToken();

		mockMvc.perform(get("/api/v1/approval-workflows?tenantId=tenant_lake")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));

		mockMvc.perform(post("/api/v1/approval-workflows")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "name": "Unsupported approval",
								  "module": "bad_module"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_APPROVAL_MODULE")));

		mockMvc.perform(post("/api/v1/approval-decisions")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "workflowId": "workflow_missing",
								  "resourceType": "loan",
								  "resourceId": "loan_missing",
								  "decision": "approved"
								}
								"""))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.error.code", is("APPROVAL_WORKFLOW_NOT_FOUND")));

		mockMvc.perform(post("/api/v1/approval-decisions")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "workflowId": "workflow_green_loans",
								  "resourceType": "loan",
								  "resourceId": "loan_green_0001",
								  "decision": "maybe"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_APPROVAL_DECISION")));

		mockMvc.perform(post("/api/v1/approval-decisions")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "workflowId": "workflow_green_loans",
								  "resourceType": "loan",
								  "resourceId": "loan_green_0001",
								  "decision": "rejected"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("APPROVAL_REASON_REQUIRED")));

		mockMvc.perform(post("/api/v1/approval-decisions")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_lake",
								  "workflowId": "workflow_green_loans",
								  "resourceType": "loan",
								  "resourceId": "loan_green_0001",
								  "decision": "approved"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("WORKFLOW_TENANT_MISMATCH")));

		mockMvc.perform(get("/api/v1/approval-workflows?tenantId=tenant_green")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))));
	}

	@Test
	void rolesAndPermissionsAreTenantScopedAndAudited() throws Exception {
		String saccoToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		mockMvc.perform(get("/api/v1/permissions")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(20)))
				.andExpect(jsonPath("$.data[?(@.id == 'members:view')].module").value("members"))
				.andExpect(jsonPath("$.data[?(@.id == 'roles:create')].action").value("create"));

		mockMvc.perform(get("/api/v1/roles")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(2)))
				.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))));

		MvcResult createdRole = mockMvc.perform(post("/api/v1/roles")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "name": "Cashier Test",
								  "permissionIds": ["members:view", "transactions:create", "transactions:create"]
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.name", is("Cashier Test")))
				.andExpect(jsonPath("$.data.protectedRole", is(false)))
				.andExpect(jsonPath("$.data.createdByUserId", is("user_green_admin")))
				.andExpect(jsonPath("$.data.permissionIds.length()", is(2)))
				.andReturn();

		String roleId = objectMapper.readTree(createdRole.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(get("/api/v1/roles")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[?(@.id == '%s')].permissionIds.length()".formatted(roleId)).value(2));

		mockMvc.perform(get("/api/v1/audit-events")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].resourceType", is("role")))
				.andExpect(jsonPath("$.data[0].resourceId", is(roleId)));
	}

	@Test
	void auditEventsAreTenantScopedForStaffAndPlatformUsers() throws Exception {
		String saccoToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String platformToken = loginAndReturnToken();
		String greenAction = "Green audit isolation " + System.currentTimeMillis();
		String lakeAction = "Lake platform audit isolation " + System.currentTimeMillis();

		mockMvc.perform(post("/api/v1/audit-events")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_lake",
								  "action": "Cross tenant audit attempt",
								  "resourceType": "tenant",
								  "resourceId": "tenant_lake"
								}
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));

		mockMvc.perform(post("/api/v1/audit-events")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "action": "%s",
								  "resourceType": "tenant",
								  "resourceId": "tenant_green"
								}
								""".formatted(greenAction)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.action", is(greenAction)));

		mockMvc.perform(post("/api/v1/audit-events")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_lake",
								  "action": "%s",
								  "resourceType": "tenant",
								  "resourceId": "tenant_lake"
								}
								""".formatted(lakeAction)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_lake")))
				.andExpect(jsonPath("$.data.action", is(lakeAction)));

		mockMvc.perform(get("/api/v1/audit-events")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))))
				.andExpect(jsonPath("$.data[*].action", hasItem(greenAction)));

		mockMvc.perform(get("/api/v1/audit-events")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].action", hasItem(lakeAction)));
	}

	@Test
	void roleControlsAreEnforced() throws Exception {
		String saccoToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String platformToken = loginAndReturnToken();

		mockMvc.perform(get("/api/v1/roles?tenantId=tenant_lake")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));

		mockMvc.perform(post("/api/v1/roles")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_lake",
								  "name": "Lake Cross Tenant"
								}
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));

		mockMvc.perform(post("/api/v1/roles")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "name": "Unknown Permission Role",
								  "permissionIds": ["members:view", "unknown:permission"]
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("UNKNOWN_PERMISSION")));

		mockMvc.perform(post("/api/v1/roles")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "name": "SACCO Administrator",
								  "permissionIds": ["roles:view"]
								}
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("ROLE_EXISTS")));

		mockMvc.perform(get("/api/v1/roles?tenantId=tenant_green")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))));

		mockMvc.perform(post("/api/v1/roles")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_green",
								  "name": "Platform Created Test",
								  "permissionIds": ["reports:view"]
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.permissionIds[0]", is("reports:view")));
	}

	@Test
	void userRolesCanBeAssignedWithinTenantAndAudited() throws Exception {
		String saccoToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String email = "loans-assignment-" + System.currentTimeMillis() + "@greenvalley.local";

		MvcResult createdUser = mockMvc.perform(post("/api/v1/users")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "fullName": "Loans Assignment Test",
								  "email": "%s",
								  "phone": "+256700777444",
								  "password": "Member@12345"
								}
								""".formatted(email)))
				.andExpect(status().isCreated())
				.andReturn();

		String userId = objectMapper.readTree(createdUser.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(get("/api/v1/users/" + userId + "/roles")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.userId", is(userId)))
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.roleIds.length()", is(0)));

		mockMvc.perform(put("/api/v1/users/" + userId + "/roles")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "roleIds": ["role_green_loans_officer", "role_green_loans_officer"]
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.userId", is(userId)))
				.andExpect(jsonPath("$.data.roleIds.length()", is(1)))
				.andExpect(jsonPath("$.data.roleIds[0]", is("role_green_loans_officer")));

		mockMvc.perform(get("/api/v1/users/" + userId + "/roles")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.roleIds[0]", is("role_green_loans_officer")));

		mockMvc.perform(get("/api/v1/audit-events")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].action", is("Updated roles for user " + email)))
				.andExpect(jsonPath("$.data[0].resourceType", is("user")))
				.andExpect(jsonPath("$.data[0].resourceId", is(userId)));
	}

	@Test
	void userRoleAssignmentControlsAreEnforced() throws Exception {
		String saccoToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String platformToken = loginAndReturnToken();

		mockMvc.perform(get("/api/v1/users/user_platform_admin/roles")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));

		mockMvc.perform(put("/api/v1/users/user_green_admin/roles")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "roleIds": []
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("ROLE_REQUIRED")));

		mockMvc.perform(put("/api/v1/users/user_green_admin/roles")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "roleIds": ["role_missing"]
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("UNKNOWN_ROLE")));

		mockMvc.perform(put("/api/v1/users/user_green_admin/roles")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "roleIds": ["role_platform_admin"]
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("ROLE_TENANT_MISMATCH")));

		mockMvc.perform(put("/api/v1/users/user_green_admin/roles")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "roleIds": ["role_green_admin", "role_green_loans_officer"]
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.roleIds.length()", is(2)))
				.andExpect(jsonPath("$.data.roleIds", hasItem("role_green_admin")))
				.andExpect(jsonPath("$.data.roleIds", hasItem("role_green_loans_officer")));
	}

	@Test
	void endpointsRequireAssignedPermissions() throws Exception {
		String saccoToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String email = "no-permission-" + System.currentTimeMillis() + "@greenvalley.local";

		mockMvc.perform(post("/api/v1/users")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "fullName": "No Permission Staff",
								  "email": "%s",
								  "phone": "+256700123888",
								  "password": "Plain@12345"
								}
								""".formatted(email)))
				.andExpect(status().isCreated());
		String noPermissionToken = loginAndReturnToken(email, "Plain@12345");

		mockMvc.perform(get("/api/v1/users")
						.header("Authorization", "Bearer " + noPermissionToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PERMISSION_REQUIRED")));

		mockMvc.perform(post("/api/v1/users")
						.header("Authorization", "Bearer " + noPermissionToken)
						.contentType("application/json")
						.content("""
								{
								  "fullName": "Denied Staff",
								  "email": "denied-%s@greenvalley.local",
								  "password": "Plain@12345"
								}
								""".formatted(System.currentTimeMillis())))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PERMISSION_REQUIRED")));

		mockMvc.perform(get("/api/v1/roles")
						.header("Authorization", "Bearer " + noPermissionToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PERMISSION_REQUIRED")));

		mockMvc.perform(get("/api/v1/tenants")
						.header("Authorization", "Bearer " + noPermissionToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PERMISSION_REQUIRED")));

		mockMvc.perform(get("/api/v1/financial-transactions")
						.header("Authorization", "Bearer " + noPermissionToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PERMISSION_REQUIRED")));

		mockMvc.perform(get("/api/v1/journal-entries")
						.header("Authorization", "Bearer " + noPermissionToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PERMISSION_REQUIRED")));

		mockMvc.perform(get("/api/v1/loans")
						.header("Authorization", "Bearer " + noPermissionToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PERMISSION_REQUIRED")));

		mockMvc.perform(get("/api/v1/approval-workflows")
						.header("Authorization", "Bearer " + noPermissionToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PERMISSION_REQUIRED")));

		mockMvc.perform(get("/api/v1/operations/status")
						.header("Authorization", "Bearer " + noPermissionToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PERMISSION_REQUIRED")));

		mockMvc.perform(get("/api/v1/notifications/deliveries")
						.header("Authorization", "Bearer " + noPermissionToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PERMISSION_REQUIRED")));

		mockMvc.perform(get("/api/v1/notification-templates")
						.header("Authorization", "Bearer " + noPermissionToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PERMISSION_REQUIRED")));

		mockMvc.perform(get("/api/v1/governance-meetings")
						.header("Authorization", "Bearer " + noPermissionToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PERMISSION_REQUIRED")));

		mockMvc.perform(get("/api/v1/complaints")
						.header("Authorization", "Bearer " + noPermissionToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PERMISSION_REQUIRED")));
	}

	@Test
	void financeEndpointsRequireFinancePermissions() throws Exception {
		String saccoToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String email = "loans-only-" + System.currentTimeMillis() + "@greenvalley.local";

		MvcResult createdUser = mockMvc.perform(post("/api/v1/users")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "fullName": "Loans Only Staff",
								  "email": "%s",
								  "phone": "+256700321999",
								  "password": "Plain@12345"
								}
								""".formatted(email)))
				.andExpect(status().isCreated())
				.andReturn();
		String userId = objectMapper.readTree(createdUser.getResponse().getContentAsString()).path("data").path("id").asString();
		mockMvc.perform(put("/api/v1/users/" + userId + "/roles")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "roleIds": ["role_green_loans_officer"]
								}
								"""))
				.andExpect(status().isOk());
		String loansOnlyToken = loginAndReturnToken(email, "Plain@12345");

		mockMvc.perform(get("/api/v1/loans")
						.header("Authorization", "Bearer " + loansOnlyToken))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/v1/financial-transactions")
						.header("Authorization", "Bearer " + loansOnlyToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PERMISSION_REQUIRED")));

		mockMvc.perform(post("/api/v1/financial-transactions")
						.header("Authorization", "Bearer " + loansOnlyToken)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_amina",
								  "type": "savings_deposit",
								  "channel": "cash",
								  "amount": 10000
								}
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PERMISSION_REQUIRED")));

		mockMvc.perform(get("/api/v1/accounting-periods")
						.header("Authorization", "Bearer " + loansOnlyToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PERMISSION_REQUIRED")));
	}

	@Test
	void operationalEndpointsRequireOperationalPermissions() throws Exception {
		String saccoToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String email = "operational-denied-" + System.currentTimeMillis() + "@greenvalley.local";

		MvcResult createdUser = mockMvc.perform(post("/api/v1/users")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "fullName": "Operational Denied Staff",
								  "email": "%s",
								  "phone": "+256700456777",
								  "password": "Plain@12345"
								}
								""".formatted(email)))
				.andExpect(status().isCreated())
				.andReturn();
		String userId = objectMapper.readTree(createdUser.getResponse().getContentAsString()).path("data").path("id").asString();
		mockMvc.perform(put("/api/v1/users/" + userId + "/roles")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "roleIds": ["role_green_loans_officer"]
								}
								"""))
				.andExpect(status().isOk());
		String loansOnlyToken = loginAndReturnToken(email, "Plain@12345");

		mockMvc.perform(get("/api/v1/loans")
						.header("Authorization", "Bearer " + loansOnlyToken))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/v1/operations/status")
						.header("Authorization", "Bearer " + loansOnlyToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PERMISSION_REQUIRED")));

		mockMvc.perform(get("/api/v1/notifications/deliveries")
						.header("Authorization", "Bearer " + loansOnlyToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PERMISSION_REQUIRED")));

		mockMvc.perform(post("/api/v1/notification-templates")
						.header("Authorization", "Bearer " + loansOnlyToken)
						.contentType("application/json")
						.content("""
								{
								  "eventType": "permission_smoke",
								  "channel": "email",
								  "title": "Permission smoke",
								  "body": "Permission smoke body"
								}
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PERMISSION_REQUIRED")));

		mockMvc.perform(post("/api/v1/governance-meetings")
						.header("Authorization", "Bearer " + loansOnlyToken)
						.contentType("application/json")
						.content("""
								{
								  "title": "Permission Smoke",
								  "meetingType": "board"
								}
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PERMISSION_REQUIRED")));

		mockMvc.perform(post("/api/v1/complaints")
						.header("Authorization", "Bearer " + loansOnlyToken)
						.contentType("application/json")
						.content("""
								{
								  "category": "service",
								  "subject": "Permission smoke"
								}
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PERMISSION_REQUIRED")));
	}

	@Test
	void loansAndApprovalsRequireDecisionPermissions() throws Exception {
		String saccoToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String email = "loan-originator-" + System.currentTimeMillis() + "@greenvalley.local";

		MvcResult createdUser = mockMvc.perform(post("/api/v1/users")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "fullName": "Loan Originator",
								  "email": "%s",
								  "phone": "+256700654222",
								  "password": "Plain@12345"
								}
								""".formatted(email)))
				.andExpect(status().isCreated())
				.andReturn();
		String userId = objectMapper.readTree(createdUser.getResponse().getContentAsString()).path("data").path("id").asString();
		mockMvc.perform(put("/api/v1/users/" + userId + "/roles")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "roleIds": ["role_green_loans_officer"]
								}
								"""))
				.andExpect(status().isOk());
		String loanOriginatorToken = loginAndReturnToken(email, "Plain@12345");

		MvcResult createdLoan = mockMvc.perform(post("/api/v1/loans")
						.header("Authorization", "Bearer " + loanOriginatorToken)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_amina",
								  "product": "Emergency Loan",
								  "amount": 100000,
								  "repaymentMonths": 6
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andReturn();
		String loanId = objectMapper.readTree(createdLoan.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(get("/api/v1/approval-workflows")
						.header("Authorization", "Bearer " + loanOriginatorToken))
				.andExpect(status().isOk());

		mockMvc.perform(patch("/api/v1/loans/" + loanId + "/status")
						.header("Authorization", "Bearer " + loanOriginatorToken)
						.contentType("application/json")
						.content("""
								{ "status": "approved" }
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PERMISSION_REQUIRED")));

		mockMvc.perform(post("/api/v1/loans/" + loanId + "/repayments")
						.header("Authorization", "Bearer " + loanOriginatorToken)
						.contentType("application/json")
						.content("""
								{
								  "amount": 10000,
								  "channel": "cash",
								  "reference": "NO-APPROVE-%s"
								}
								""".formatted(System.currentTimeMillis())))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PERMISSION_REQUIRED")));

		mockMvc.perform(post("/api/v1/approval-decisions")
						.header("Authorization", "Bearer " + loanOriginatorToken)
						.contentType("application/json")
						.content("""
								{
								  "workflowId": "workflow_green_loans",
								  "resourceType": "loan",
								  "resourceId": "%s",
								  "decision": "approved"
								}
								""".formatted(loanId)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PERMISSION_REQUIRED")));
	}

	private String loginAndReturnToken() throws Exception {
		return loginAndReturnToken("admin@platform.local", "Admin@12345");
	}

	private String loginAndReturnToken(String email, String password) throws Exception {
		MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
						.contentType("application/json")
						.content("""
								{
								  "email": "%s",
								  "password": "%s"
								}
								""".formatted(email, password)))
				.andExpect(status().isOk())
				.andReturn();

		JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
		return root.path("data").path("token").asString();
	}

	private String memberLoginAndReturnToken(String identifier, String password) throws Exception {
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

		JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
		return root.path("data").path("token").asString();
	}

	private String createApprovedAndDisbursedLoan(String staffToken, int amount) throws Exception {
		MvcResult createdLoan = mockMvc.perform(post("/api/v1/loans")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_amina",
								  "product": "Emergency Loan",
								  "amount": %d,
								  "repaymentMonths": 4
								}
								""".formatted(amount)))
				.andExpect(status().isCreated())
				.andReturn();

		String loanId = objectMapper.readTree(createdLoan.getResponse().getContentAsString()).path("data").path("id").asString();
		MvcResult guarantor = mockMvc.perform(post("/api/v1/loans/" + loanId + "/guarantors")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_daniel",
								  "guaranteedAmount": 100000
								}
								"""))
				.andExpect(status().isCreated())
				.andReturn();

		String guarantorId = objectMapper.readTree(guarantor.getResponse().getContentAsString()).path("data").path("id").asString();
		String memberToken = memberLoginAndReturnToken("GVS-0002", "Member@12345");

		mockMvc.perform(patch("/api/v1/member-auth/guarantor-requests/" + guarantorId + "/status")
						.header("Authorization", "Bearer " + memberToken)
						.contentType("application/json")
						.content("""
								{ "status": "accepted" }
								"""))
				.andExpect(status().isOk());

		mockMvc.perform(patch("/api/v1/loans/" + loanId + "/status")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{ "status": "approved" }
								"""))
				.andExpect(status().isOk());

		mockMvc.perform(post("/api/v1/loans/" + loanId + "/disburse")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk());

		return loanId;
	}

	private JsonNode loanFromList(MvcResult loans, String loanId) throws Exception {
		JsonNode data = objectMapper.readTree(loans.getResponse().getContentAsString()).path("data");
		for (JsonNode loan : data) {
			if (loanId.equals(loan.path("id").asString())) {
				return loan;
			}
		}
		throw new AssertionError("Loan not found in response: " + loanId);
	}

	private boolean hasJournalSource(JsonNode journalData, String sourceType) {
		for (JsonNode journal : journalData) {
			if (sourceType.equals(journal.path("sourceType").asString()) && journal.path("lines").size() >= 2) {
				return true;
			}
		}
		return false;
	}

	private boolean hasJournalReference(JsonNode journalData, String reference, String sourceType) {
		for (JsonNode journal : journalData) {
			if (reference.equals(journal.path("reference").asString())
					&& sourceType.equals(journal.path("sourceType").asString())
					&& journal.path("isBalanced").asBoolean()) {
				return true;
			}
		}
		return false;
	}

	private int countJournalReference(JsonNode journalData, String reference, String sourceType) {
		int count = 0;
		for (JsonNode journal : journalData) {
			if (reference.equals(journal.path("reference").asString())
					&& sourceType.equals(journal.path("sourceType").asString())) {
				count++;
			}
		}
		return count;
	}

	private JsonNode journalByReference(JsonNode journalData, String reference, String sourceType) {
		for (JsonNode journal : journalData) {
			if (reference.equals(journal.path("reference").asString())
					&& sourceType.equals(journal.path("sourceType").asString())) {
				return journal;
			}
		}
		throw new AssertionError("Journal not found for reference " + reference + " and source type " + sourceType);
	}

	private String createTenantForImport(String token, String registrationNo) throws Exception {
		MvcResult createdTenant = mockMvc.perform(post("/api/v1/tenants")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "name": "Import Helper SACCO",
								  "abbreviation": "IHS",
								  "registrationNo": "%s",
								  "district": "Kampala",
								  "licenseExpiry": "2027-12-31",
								  "packageId": "starter"
								}
								""".formatted(registrationNo)))
				.andExpect(status().isCreated())
				.andReturn();
		return objectMapper.readTree(createdTenant.getResponse().getContentAsString()).path("data").path("id").asString();
	}

	private String createBranchForImport(String token, String tenantId) throws Exception {
		MvcResult createdBranch = mockMvc.perform(post("/api/v1/branches")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "%s",
								  "code": "MAIN",
								  "name": "Main Branch",
								  "address": "Import Road"
								}
								""".formatted(tenantId)))
				.andExpect(status().isCreated())
				.andReturn();
		return objectMapper.readTree(createdBranch.getResponse().getContentAsString()).path("data").path("id").asString();
	}

	private String createImportedMember(String token, String tenantId, String branchId, String membershipNo, String phone) throws Exception {
		MvcResult importedMember = mockMvc.perform(post("/api/v1/members/import")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "%s",
								  "dryRun": false,
								  "rows": [
								    {
								      "membershipNo": "%s",
								      "branchId": "%s",
								      "fullName": "Import Helper Member",
								      "phone": "%s",
								      "password": "Member@12345"
								    }
								  ]
								}
								""".formatted(tenantId, membershipNo, branchId, phone)))
				.andExpect(status().isCreated())
				.andReturn();
		return objectMapper.readTree(importedMember.getResponse().getContentAsString()).path("data").path("createdMembers").path(0).path("id").asString();
	}

	private String importLoanForRepaymentHistory(String token, String tenantId, String membershipNo, String runId) throws Exception {
		MvcResult importedLoan = mockMvc.perform(post("/api/v1/loans/import")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "%s",
								  "dryRun": false,
								  "rows": [
								    {
								      "membershipNo": "%s",
								      "product": "Development Loan",
								      "originalAmount": "1200000",
								      "outstandingBalance": "900000",
								      "repaymentMonths": "12",
								      "remainingMonths": "9",
								      "monthlyInstallment": "100000",
								      "disbursedDate": "2026-04-18",
								      "status": "active",
								      "purpose": "Migrated loan for repayment history %s"
								    }
								  ]
								}
								""".formatted(tenantId, membershipNo, runId)))
				.andExpect(status().isCreated())
				.andReturn();
		return objectMapper.readTree(importedLoan.getResponse().getContentAsString()).path("data").path("createdLoans").path(0).path("id").asString();
	}

}
