package com.methaltech.sacco;

import com.methaltech.sacco.accounting.MobileMoneyReconciliationJob;
import java.time.LocalDate;
import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.emptyOrNullString;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
@SpringBootTest(
		webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
		properties = {"sacco.rate-limit.enabled=false", "sacco.notifications.broadcast-async=false"})
class SaccoBackendApplicationTests {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Autowired
	private MeterRegistry meterRegistry;

	@Autowired
	private MobileMoneyReconciliationJob mobileMoneyReconciliationJob;

	@Autowired
	private com.methaltech.sacco.subscription.SubscriptionLifecycleService subscriptionLifecycleService;

	@Autowired
	private com.methaltech.sacco.member.MemberSubscriptionService memberSubscriptionService;

	@Test
	void contextLoads() {
	}

	@Test
	void healthEndpointUsesApiEnvelopeAndSecurityHeaders() throws Exception {
		mockMvc.perform(get("/api/v1/health"))
				.andExpect(status().isOk())
				.andExpect(header().string("X-Content-Type-Options", "nosniff"))
				.andExpect(header().string("X-Frame-Options", "DENY"))
				.andExpect(header().string("Strict-Transport-Security", "max-age=31536000; includeSubDomains"))
				.andExpect(header().string("Referrer-Policy", "no-referrer"))
				.andExpect(header().string("Cross-Origin-Opener-Policy", "same-origin"))
				.andExpect(header().string("Content-Security-Policy", containsString("default-src 'self'")))
				.andExpect(header().string("Content-Security-Policy", containsString("frame-ancestors 'none'")))
				.andExpect(jsonPath("$.data.ok", is(true)))
				.andExpect(jsonPath("$.data.demoLoginsEnabled", is(true)))
				.andExpect(jsonPath("$.data.service", is("multiSaccoApp Java API")));
	}

	@Test
	void everyResponseCarriesAGeneratedCorrelationId() throws Exception {
		mockMvc.perform(get("/api/v1/health"))
				.andExpect(status().isOk())
				.andExpect(header().exists("X-Correlation-Id"))
				.andExpect(header().string("X-Correlation-Id", not(emptyOrNullString())));
	}

	@Test
	void inboundCorrelationIdIsEchoedBack() throws Exception {
		mockMvc.perform(get("/api/v1/health").header("X-Correlation-Id", "trace-abc-123"))
				.andExpect(status().isOk())
				.andExpect(header().string("X-Correlation-Id", is("trace-abc-123")));
	}

	@Test
	void inboundCorrelationIdIsBoundedForLogsAndResponses() throws Exception {
		String longCorrelationId = "trace-" + "x".repeat(80);

		mockMvc.perform(get("/api/v1/health").header("X-Correlation-Id", longCorrelationId))
				.andExpect(status().isOk())
				.andExpect(header().string("X-Correlation-Id", is(longCorrelationId.substring(0, 64))));
	}

	@Test
	void legacyRequestIdHeaderCanProvideCorrelationId() throws Exception {
		mockMvc.perform(get("/api/v1/health").header("X-Request-Id", "legacy-trace-123"))
				.andExpect(status().isOk())
				.andExpect(header().string("X-Correlation-Id", is("legacy-trace-123")));
	}

	@Test
	void prometheusAndMetricsEndpointsAreExposed() throws Exception {
		mockMvc.perform(get("/actuator/metrics"))
				.andExpect(status().isOk());
		org.junit.jupiter.api.Assertions.assertFalse(meterRegistry.getMeters().isEmpty());
	}

	@Test
	void financialTransactionsSupportOptInPaginationAndRemainBackwardCompatible() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		// Opt-in pagination returns a page envelope with metadata and a capped page.
		mockMvc.perform(get("/api/v1/financial-transactions?page=0&size=1")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data", notNullValue()))
				.andExpect(jsonPath("$.page.number", is(0)))
				.andExpect(jsonPath("$.page.size", is(1)))
				.andExpect(jsonPath("$.page.totalElements", greaterThanOrEqualTo(0)));

		// Without page/size the response keeps its original shape: a plain data array, no page block.
		mockMvc.perform(get("/api/v1/financial-transactions")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data", notNullValue()))
				.andExpect(jsonPath("$.page").doesNotExist());

		// The same opt-in pattern applies to members, loans, audit events and notification deliveries.
		mockMvc.perform(get("/api/v1/members?page=0&size=2")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.page.size", is(2)))
				.andExpect(jsonPath("$.page.totalElements", greaterThanOrEqualTo(0)));

		mockMvc.perform(get("/api/v1/members?page=0&size=2&search=GVS-0001")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.page.size", is(2)))
				.andExpect(jsonPath("$.page.totalElements", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data[0].membershipNo", is("GVS-0001")));

		mockMvc.perform(get("/api/v1/members?page=0&size=2&sort=fullName&direction=desc")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.page.size", is(2)));

		mockMvc.perform(get("/api/v1/loans?page=0&size=2")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.page.number", is(0)))
				.andExpect(jsonPath("$.page.size", is(2)));

		mockMvc.perform(get("/api/v1/loans?page=0&size=2&search=loan")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.page.size", is(2)))
				.andExpect(jsonPath("$.page.totalElements", greaterThanOrEqualTo(0)));

		mockMvc.perform(get("/api/v1/financial-transactions?page=0&size=2&search=savings")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.page.size", is(2)))
				.andExpect(jsonPath("$.page.totalElements", greaterThanOrEqualTo(0)));

		mockMvc.perform(get("/api/v1/financial-transactions?page=0&size=2&sort=amount&direction=asc")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.page.size", is(2)));

		mockMvc.perform(get("/api/v1/audit-events?page=0&size=5")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.page.size", is(5)));

		mockMvc.perform(get("/api/v1/audit-events?page=0&size=5&search=login")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.page.size", is(5)))
				.andExpect(jsonPath("$.page.totalElements", greaterThanOrEqualTo(0)));

		mockMvc.perform(get("/api/v1/audit-events?page=0&size=5&sort=action&direction=asc")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.page.size", is(5)));

		mockMvc.perform(get("/api/v1/notifications/deliveries?page=0&size=5")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.page.size", is(5)));

		mockMvc.perform(get("/api/v1/notifications/deliveries?page=0&size=5&sort=channel&direction=asc")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.page.size", is(5)));
	}

	@Test
	void platformControlsAllowedCollectionModeAndSaccoCannotExceedIt() throws Exception {
		String platformToken = loginAndReturnToken();
		String saccoAdminToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String memberToken = memberLoginAndReturnToken("GVS-0001", "Member@12345");

		// 1) Platform sets NONE -> member online payment is blocked and the dashboard reflects it.
		setCollectionMode(platformToken, "NONE");
		mockMvc.perform(post("/api/v1/integrations/mobile-money/payment-requests")
						.header("Authorization", "Bearer " + memberToken)
						.contentType("application/json")
						.content("""
								{ "purpose": "savings_deposit", "amount": 5000, "payerPhone": "+256700000001", "provider": "mtn" }
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("COLLECTION_METHOD_NOT_ALLOWED")));

		mockMvc.perform(get("/api/v1/member-auth/mobile-dashboard").header("Authorization", "Bearer " + memberToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.tenant.allowedCollectionMode", is("NONE")))
				.andExpect(jsonPath("$.data.tenant.mobileMoneyCollectionAvailable", is(false)));

		// 2) Platform sets BANK_ONLY -> SACCO admin cannot switch on mobile money.
		setCollectionMode(platformToken, "BANK_ONLY");
		mockMvc.perform(patch("/api/v1/tenants/tenant_green/collection-settings")
						.header("Authorization", "Bearer " + saccoAdminToken)
						.contentType("application/json")
						.content("""
								{ "mobileMoneyActive": true, "bankActive": false }
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("COLLECTION_METHOD_NOT_ALLOWED")));

		// 3) SACCO admin cannot change the allowed mode itself (platform-only).
		mockMvc.perform(patch("/api/v1/tenants/tenant_green/collection-mode")
						.header("Authorization", "Bearer " + saccoAdminToken)
						.contentType("application/json")
						.content("""
								{ "allowedCollectionMode": "BOTH" }
								"""))
				.andExpect(status().isForbidden());

		// 4) Restore: platform allows BOTH, SACCO activates mobile money; availability returns.
		setCollectionMode(platformToken, "BOTH");
		mockMvc.perform(patch("/api/v1/tenants/tenant_green/collection-settings")
						.header("Authorization", "Bearer " + saccoAdminToken)
						.contentType("application/json")
						.content("""
								{ "mobileMoneyActive": true, "bankActive": false }
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.mobileMoneyCollectionAvailable", is(true)));

		mockMvc.perform(get("/api/v1/member-auth/mobile-dashboard").header("Authorization", "Bearer " + memberToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.tenant.mobileMoneyCollectionAvailable", is(true)));
	}

	@Test
	void saccoManagesItsOwnCollectionAccountsAndMembersSeeThem() throws Exception {
		String platformToken = loginAndReturnToken();
		String saccoAdminToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String memberToken = memberLoginAndReturnToken("GVS-0001", "Member@12345");

		setCollectionMode(platformToken, "BOTH");
		setCollectionSettings(saccoAdminToken, true, true);

		// Green Valley is allowed for BOTH, so a SACCO admin can add its own mobile-money account.
		MvcResult created = mockMvc.perform(post("/api/v1/sacco-payment-accounts")
						.header("Authorization", "Bearer " + saccoAdminToken)
						.contentType("application/json")
						.content("""
								{ "channel": "mobile_money", "network": "mtn", "accountName": "Green Valley Collections", "accountNumber": "0779123456", "instructions": "Use your membership number as reference" }
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.channel", is("mobile_money")))
				.andExpect(jsonPath("$.data.accountNumber", is("0779123456")))
				.andReturn();
		String accountId = objectMapper.readTree(created.getResponse().getContentAsString()).path("data").path("id").asString();

		// The SACCO admin lists its own accounts.
		mockMvc.perform(get("/api/v1/sacco-payment-accounts").header("Authorization", "Bearer " + saccoAdminToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].accountNumber", hasItem("0779123456")));

		// Platform can inspect, but cannot register SACCO-owned money accounts.
		mockMvc.perform(post("/api/v1/sacco-payment-accounts?tenantId=tenant_green")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{ "channel": "mobile_money", "network": "airtel", "accountName": "Platform Should Not Own This", "accountNumber": "0700123456" }
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("SACCO_STAFF_REQUIRED")));

		// Members see the SACCO's active collection accounts (where to pay).
		mockMvc.perform(get("/api/v1/member-auth/collection-accounts").header("Authorization", "Bearer " + memberToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].accountNumber", hasItem("0779123456")));

		// If the platform later disallows online collection, members no longer see the account.
		setCollectionMode(platformToken, "NONE");
		mockMvc.perform(get("/api/v1/member-auth/collection-accounts").header("Authorization", "Bearer " + memberToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", is(0)));

		// A SACCO admin cannot add a channel the platform disallows.
		setCollectionMode(platformToken, "MOBILE_MONEY_ONLY");
		mockMvc.perform(post("/api/v1/sacco-payment-accounts")
						.header("Authorization", "Bearer " + saccoAdminToken)
						.contentType("application/json")
						.content("""
								{ "channel": "bank", "accountName": "Green Valley Bank", "accountNumber": "01234567890", "bankName": "Stanbic" }
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("COLLECTION_METHOD_NOT_ALLOWED")));

		// Restore Green Valley to BOTH and clean up the created account.
		setCollectionMode(platformToken, "BOTH");
		setCollectionSettings(saccoAdminToken, true, true);
		mockMvc.perform(delete("/api/v1/sacco-payment-accounts/" + accountId).header("Authorization", "Bearer " + saccoAdminToken))
				.andExpect(status().isNoContent());
	}

	private void setCollectionMode(String platformToken, String mode) throws Exception {
		mockMvc.perform(patch("/api/v1/tenants/tenant_green/collection-mode")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("{ \"allowedCollectionMode\": \"" + mode + "\" }"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.allowedCollectionMode", is(mode)));
	}

	private void setCollectionSettings(String saccoAdminToken, boolean mobileMoneyActive, boolean bankActive) throws Exception {
		mockMvc.perform(patch("/api/v1/tenants/tenant_green/collection-settings")
						.header("Authorization", "Bearer " + saccoAdminToken)
						.contentType("application/json")
						.content("{ \"mobileMoneyActive\": " + mobileMoneyActive + ", \"bankActive\": " + bankActive + " }"))
				.andExpect(status().isOk());
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
				.andExpect(jsonPath("$.data[0].country", is("Uganda")))
				.andExpect(jsonPath("$.data[0].localeCode", is("en-UG")))
				.andExpect(jsonPath("$.data[0].currencyCode", is("UGX")))
				.andExpect(jsonPath("$.data[0].currencyDigits", is(0)))
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
								  "district": "Nairobi",
								  "country": "Kenya",
								  "localeCode": "en-KE",
								  "currencyCode": "KES",
								  "currencyDigits": 0,
								  "licenseExpiry": "2027-12-31",
								  "packageId": "starter"
								}
								""".formatted(registrationNo)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.status", is("pending_review")))
				.andExpect(jsonPath("$.data.abbreviation", is("SJS")))
				.andExpect(jsonPath("$.data.country", is("Kenya")))
				.andExpect(jsonPath("$.data.localeCode", is("en-KE")))
				.andExpect(jsonPath("$.data.currencyCode", is("KES")))
				.andReturn();

		String tenantId = objectMapper.readTree(createdTenant.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(get("/api/v1/tenants/" + tenantId)
				.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.registrationNo", is(registrationNo)))
				.andExpect(jsonPath("$.data.currencyCode", is("KES")));

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
	void platformPaidRegistrationCreatesActiveSubscriptionAndUnpaidSaccoCannotLogin() throws Exception {
		String token = loginAndReturnToken();
		long unique = System.currentTimeMillis();
		String paidCode = "P" + (unique % 100000);
		String unpaidCode = "U" + (unique % 100000);

		MvcResult paidTenantResult = mockMvc.perform(post("/api/v1/tenants")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "name": "Paid Gate SACCO",
								  "abbreviation": "%s",
								  "registrationNo": "COOP-PAID-%s",
								  "district": "Kampala",
								  "parish": "Central",
								  "village": "Market Zone",
								  "contactNumber": "+256701111111",
								  "memberRange": "100-250",
								  "country": "Uganda",
								  "localeCode": "en-UG",
								  "currencyCode": "UGX",
								  "currencyDigits": 0,
								  "licenseExpiry": "2027-12-31",
								  "packageId": "starter",
								  "paymentStatus": "paid"
								}
								""".formatted(paidCode, unique)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.status", is("active")))
				.andExpect(jsonPath("$.data.abbreviation", is(paidCode)))
				.andReturn();
		String paidTenantId = objectMapper.readTree(paidTenantResult.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(get("/api/v1/subscriptions?tenantId=" + paidTenantId)
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", is(1)))
				.andExpect(jsonPath("$.data[0].status", is("active")))
				.andExpect(jsonPath("$.data[0].paid", is(500000.00)))
				.andExpect(jsonPath("$.data[0].billingDescription", is("UGX 5,000 per member annually, minimum 100 members")));

		MvcResult unpaidTenantResult = mockMvc.perform(post("/api/v1/tenants")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "name": "Unpaid Gate SACCO",
								  "abbreviation": "%s",
								  "registrationNo": "COOP-UNPAID-%s",
								  "district": "Wakiso",
								  "licenseExpiry": "2027-12-31",
								  "packageId": "starter",
								  "paymentStatus": "pending"
								}
								""".formatted(unpaidCode, unique)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.status", is("pending_review")))
				.andReturn();
		String unpaidTenantId = objectMapper.readTree(unpaidTenantResult.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(patch("/api/v1/tenants/" + unpaidTenantId + "/status")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{ "status": "active" }
								"""))
				.andExpect(status().isOk());

		String unpaidEmail = "unpaid-" + unique + "@example.local";
		mockMvc.perform(post("/api/v1/users")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "%s",
								  "fullName": "Unpaid SACCO Admin",
								  "email": "%s",
								  "phone": "+256701222222",
								  "password": "Unpaid@12345"
								}
								""".formatted(unpaidTenantId, unpaidEmail)))
				.andExpect(status().isCreated());

		mockMvc.perform(post("/api/v1/auth/login")
						.contentType("application/json")
						.content("""
								{
								  "saccoCode": "%s",
								  "email": "%s",
								  "password": "Unpaid@12345"
								}
								""".formatted(unpaidCode, unpaidEmail)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("SACCO_ACCESS_INACTIVE")))
				.andExpect(jsonPath("$.error.message", containsString("subscription payment")));

		String callbackReference = "SUB-MM-" + unique;
		mockMvc.perform(post("/api/v1/integrations/mobile-money/subscription-callback")
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "%s",
								  "amount": 500000,
								  "externalReference": "%s",
								  "provider": "mtn_momo",
								  "receivedAt": "2026-07-16T09:00:00Z"
								}
								""".formatted(unpaidTenantId, callbackReference)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.idempotent", is(false)))
				.andExpect(jsonPath("$.data.subscription.status", is("active")))
				.andExpect(jsonPath("$.data.subscription.paid", is(500000.00)))
				.andExpect(jsonPath("$.data.payment.channel", is("mobile_money:mtn_momo")))
				.andExpect(jsonPath("$.data.payment.externalReference", is(callbackReference)));

		mockMvc.perform(post("/api/v1/integrations/mobile-money/subscription-callback")
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "%s",
								  "amount": 500000,
								  "externalReference": "%s",
								  "provider": "mtn_momo",
								  "receivedAt": "2026-07-16T09:00:00Z"
								}
								""".formatted(unpaidTenantId, callbackReference)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.idempotent", is(true)))
				.andExpect(jsonPath("$.data.payment.externalReference", is(callbackReference)));

		mockMvc.perform(post("/api/v1/auth/login")
						.contentType("application/json")
						.content("""
								{
								  "saccoCode": "%s",
								  "email": "%s",
								  "password": "Unpaid@12345"
								}
								""".formatted(unpaidCode, unpaidEmail)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.user.tenantId", is(unpaidTenantId)));
	}

	@Test
	void publicSaccoRegistrationPaymentCallbackMovesApplicationToReviewQueue() throws Exception {
		String platformToken = loginAndReturnToken();
		long unique = System.currentTimeMillis();
		String requestedCode = "R" + (unique % 100000);

		MvcResult registration = mockMvc.perform(post("/api/v1/public/sacco-registrations")
						.contentType("application/json")
						.content("""
								{
								  "name": "Public Payment SACCO",
								  "saccoCode": "%s",
								  "registrationNo": "COOP-PUBLIC-%s",
								  "district": "Mukono",
								  "parish": "Central",
								  "village": "Trading Centre",
								  "country": "Uganda",
								  "localeCode": "en-UG",
								  "currencyCode": "UGX",
								  "currencyDigits": 0,
								  "contactNumber": "+256703333333",
								  "memberRange": "100-250",
								  "paymentPhone": "+256704444444"
								}
								""".formatted(requestedCode, unique)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenant.status", is("pending_self_registration")))
				.andExpect(jsonPath("$.data.subscription.status", is("trial")))
				.andExpect(jsonPath("$.data.paymentAmount", is(500000)))
				.andExpect(jsonPath("$.data.paymentStatus", is("trial_active")))
				.andReturn();

		JsonNode data = objectMapper.readTree(registration.getResponse().getContentAsString()).path("data");
		String tenantId = data.path("tenant").path("id").asString();
		String paymentReference = data.path("paymentReference").asString();

		mockMvc.perform(post("/api/v1/integrations/mobile-money/subscription-callback")
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "%s",
								  "amount": 500000,
								  "externalReference": "%s",
								  "provider": "airtel_money",
								  "receivedAt": "2026-07-16T09:00:00Z"
								}
								""".formatted(tenantId, paymentReference)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.subscription.status", is("active")))
				.andExpect(jsonPath("$.data.payment.channel", is("mobile_money:airtel_money")));

		mockMvc.perform(get("/api/v1/tenants/" + tenantId)
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status", is("pending_review")));
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
				.andExpect(jsonPath("$.data[0].memberCount", is(8)))
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
								  "saccoCode": "PLATFORM",
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

		mockMvc.perform(post("/api/v1/auth/login")
						.contentType("application/json")
						.content("""
								{
								  "email": "admin@platform.local",
								  "password": "Admin@12345"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("LOGIN_REQUIRED")));
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
				.andExpect(jsonPath("$.data.permissionIds", hasItem("approvals:decide")))
				.andExpect(jsonPath("$.data.permissionIds", hasItem("members:view")))
				.andExpect(jsonPath("$.data.permissionIds", everyItem(not("members:create"))))
				.andExpect(jsonPath("$.data.permissionIds", everyItem(not("members:approve"))));

		mockMvc.perform(post("/api/v1/auth/login")
						.contentType("application/json")
						.content("""
								{
								  "saccoCode": "PLATFORM",
								  "username": "operations@platform.local",
								  "password": "Operations@12345"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.roleNames", hasItem("Platform Operations Officer")))
				.andExpect(jsonPath("$.data.permissionIds", hasItem("operations:view")))
				.andExpect(jsonPath("$.data.permissionIds", hasItem("notifications:view")));

		mockMvc.perform(post("/api/v1/auth/login")
						.contentType("application/json")
						.content("""
								{
								  "saccoCode": "PLATFORM",
								  "username": "billing@platform.local",
								  "password": "Billing@12345"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.roleNames", hasItem("Platform Billing Officer")))
				.andExpect(jsonPath("$.data.permissionIds", hasItem("subscriptions:manage")));

		mockMvc.perform(post("/api/v1/auth/login")
						.contentType("application/json")
						.content("""
								{
								  "saccoCode": "PLATFORM",
								  "username": "compliance@platform.local",
								  "password": "Compliance@12345"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.roleNames", hasItem("Platform Compliance Officer")))
				.andExpect(jsonPath("$.data.permissionIds", hasItem("accounting:view")))
				.andExpect(jsonPath("$.data.permissionIds", hasItem("reports:view")));

		mockMvc.perform(post("/api/v1/auth/login")
						.contentType("application/json")
						.content("""
								{
								  "saccoCode": "PLATFORM",
								  "username": "support@platform.local",
								  "password": "Support@12345"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.roleNames", hasItem("Platform Support Officer")))
				.andExpect(jsonPath("$.data.permissionIds", hasItem("members:view")))
				.andExpect(jsonPath("$.data.permissionIds", hasItem("complaints:view")));
	}

	@Test
	void recommendedRoleMatrixSeedsExpectedPlatformAndSaccoAccess() throws Exception {
		String platformToken = loginAndReturnToken();

		mockMvc.perform(get("/api/v1/roles?tenantId=tenant_platform")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[?(@.id == 'role_platform_super_admin')].permissionIds[*]", hasItem("subscriptions:manage")))
				.andExpect(jsonPath("$.data[?(@.id == 'role_platform_operations_officer')].permissionIds[*]", hasItem("operations:view")))
				.andExpect(jsonPath("$.data[?(@.id == 'role_platform_billing_officer')].permissionIds[*]", hasItem("subscriptions:view")))
				.andExpect(jsonPath("$.data[?(@.id == 'role_platform_compliance_officer')].permissionIds[*]", hasItem("accounting:view")))
				.andExpect(jsonPath("$.data[?(@.id == 'role_platform_support_officer')].permissionIds[*]", hasItem("complaints:view")));

		mockMvc.perform(get("/api/v1/roles?tenantId=tenant_green")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[?(@.id == 'role_green_treasurer')].permissionIds[*]", hasItem("transactions:approve")))
				.andExpect(jsonPath("$.data[?(@.id == 'role_green_secretary')].permissionIds[*]", hasItem("members:approve")))
				.andExpect(jsonPath("$.data[?(@.id == 'role_green_chairperson')].permissionIds[*]", hasItem("approvals:decide")))
				.andExpect(jsonPath("$.data[?(@.id == 'role_green_chairperson')].permissionIds[*]", hasItem("members:view")))
				.andExpect(jsonPath("$.data[?(@.id == 'role_green_accountant')].permissionIds[*]", hasItem("accounting:post")))
				.andExpect(jsonPath("$.data[?(@.id == 'role_green_teller')].permissionIds[*]", hasItem("transactions:create")))
				.andExpect(jsonPath("$.data[?(@.id == 'role_green_auditor')].permissionIds[*]", hasItem("reports:view")));
	}

	@Test
	void chairpersonCanReadMembersButCannotChangeMemberStatus() throws Exception {
		String token = loginAndReturnToken("chairperson@greenvalley.local", "Chair@12345");

		mockMvc.perform(get("/api/v1/members")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data[*].membershipNo", hasItem("GVS-0001")));

		mockMvc.perform(patch("/api/v1/members/member_green_amina/status")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{ "status": "active" }
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PERMISSION_REQUIRED")))
				.andExpect(jsonPath("$.error.message", containsString("members:approve")));
	}

	@Test
	void saccoRoleSensitiveActionsArePermissionBounded() throws Exception {
		String platformToken = loginAndReturnToken();
		String treasurerToken = loginAndReturnToken("treasurer@greenvalley.local", "Treasurer@12345");
		String secretaryToken = loginAndReturnToken("secretary@greenvalley.local", "Secretary@12345");
		String chairToken = loginAndReturnToken("chairperson@greenvalley.local", "Chair@12345");
		String memberName = "Role Boundary Member " + System.currentTimeMillis();

		mockMvc.perform(post("/api/v1/members")
						.header("Authorization", "Bearer " + platformToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_lake",
								  "branchId": "branch_lake_main",
								  "fullName": "%s",
								  "memberType": "individual",
								  "phone": "+256701%06d",
								  "email": "role-boundary-%d@greenvalley.local",
								  "nationalId": "RB%d",
								  "password": "Member@12345"
								}
								""".formatted(memberName, System.currentTimeMillis() % 1000000, System.currentTimeMillis(), System.currentTimeMillis())))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.fullName", is(memberName)));

		mockMvc.perform(post("/api/v1/members")
						.header("Authorization", "Bearer " + chairToken)
						.contentType("application/json")
						.content("""
								{
								  "branchId": "branch_green_main",
								  "fullName": "Chairperson Should Not Create",
								  "memberType": "individual",
								  "phone": "+256701111111",
								  "email": "chairperson-create-denied@greenvalley.local",
								  "nationalId": "RB-DENIED",
								  "password": "Member@12345"
								}
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PERMISSION_REQUIRED")))
				.andExpect(jsonPath("$.error.message", containsString("members:create")));

		mockMvc.perform(patch("/api/v1/members/member_green_amina/status")
						.header("Authorization", "Bearer " + secretaryToken)
						.contentType("application/json")
						.content("""
								{ "status": "active", "kycStatus": "verified" }
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status", is("active")));

		mockMvc.perform(post("/api/v1/financial-transactions")
						.header("Authorization", "Bearer " + treasurerToken)
						.contentType("application/json")
						.content("""
								{
								  "branchId": "branch_green_main",
								  "memberId": "member_green_amina",
								  "type": "savings_deposit",
								  "channel": "bank",
								  "amount": 25000,
								  "narration": "Treasurer role boundary deposit"
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.type", is("savings_deposit")))
				.andExpect(jsonPath("$.data.channel", is("bank")));

		mockMvc.perform(post("/api/v1/financial-transactions")
						.header("Authorization", "Bearer " + secretaryToken)
						.contentType("application/json")
						.content("""
								{
								  "branchId": "branch_green_main",
								  "memberId": "member_green_amina",
								  "type": "savings_deposit",
								  "channel": "cash",
								  "amount": 10000
								}
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.message", containsString("transactions:create")));

		mockMvc.perform(patch("/api/v1/members/member_green_amina/status")
						.header("Authorization", "Bearer " + treasurerToken)
						.contentType("application/json")
						.content("""
								{ "status": "active" }
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.message", containsString("members:approve")));

		mockMvc.perform(post("/api/v1/loans")
						.header("Authorization", "Bearer " + chairToken)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_amina",
								  "product": "Emergency Loan",
								  "amount": 100000,
								  "repaymentMonths": 4
								}
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.message", containsString("loans:create")));

		mockMvc.perform(post("/api/v1/users")
						.header("Authorization", "Bearer " + treasurerToken)
						.contentType("application/json")
						.content("""
								{
								  "fullName": "Denied Treasurer User",
								  "email": "denied-treasurer-user@greenvalley.local",
								  "phone": "+256702000000",
								  "password": "StrongPass@12345"
								}
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.message", containsString("users:create")));

	}

	@Test
	void loginRejectsBadPassword() throws Exception {
		mockMvc.perform(post("/api/v1/auth/login")
						.contentType("application/json")
						.content("""
								{
								  "saccoCode": "PLATFORM",
								  "username": "admin@platform.local",
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
								  "saccoCode": "GVS",
								  "username": "%s",
								  "password": "Temp@12345"
								}
								""".formatted(email)))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.error.code", is("AUTH_INVALID")));

		mockMvc.perform(post("/api/v1/auth/login")
						.contentType("application/json")
						.content("""
								{
								  "saccoCode": "GVS",
								  "username": "%s",
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
								  "password": "MfaAdmin@12345"
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
		String staffToken = loginAndReturnToken(email, "MfaAdmin@12345");

		mockMvc.perform(post("/api/v1/auth/mfa/enable")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.mfaEnabled", is(true)));

		MvcResult challengeResult = mockMvc.perform(post("/api/v1/auth/login")
						.contentType("application/json")
						.content("""
								{
								  "saccoCode": "GVS",
								  "username": "%s",
								  "password": "MfaAdmin@12345"
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
	void platformSuperAdminCanCreatePlatformUsers() throws Exception {
		String token = loginAndReturnToken();
		String email = "platform-created-" + System.currentTimeMillis() + "@tereka.local";

		MvcResult createdUser = mockMvc.perform(post("/api/v1/users")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_platform",
								  "fullName": "Created Platform Support",
								  "email": "%s",
								  "phone": "+256700111333",
								  "password": "Platform@12345"
								}
								""".formatted(email)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_platform")))
				.andExpect(jsonPath("$.data.email", is(email)))
				.andExpect(jsonPath("$.data.passwordHash").doesNotExist())
				.andReturn();
		String userId = objectMapper.readTree(createdUser.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(put("/api/v1/users/" + userId + "/roles")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "roleIds": ["role_platform_support_officer"]
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.roleIds", hasItem("role_platform_support_officer")));
	}

	@Test
	void nonSuperPlatformAdminCannotCreatePlatformUsers() throws Exception {
		String superAdminToken = loginAndReturnToken();
		String legacyEmail = "platform-legacy-" + System.currentTimeMillis() + "@tereka.local";

		MvcResult createdUser = mockMvc.perform(post("/api/v1/users")
						.header("Authorization", "Bearer " + superAdminToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_platform",
								  "fullName": "Legacy Platform Administrator",
								  "email": "%s",
								  "phone": "+256700111444",
								  "password": "Legacy@12345"
								}
								""".formatted(legacyEmail)))
				.andExpect(status().isCreated())
				.andReturn();
		String legacyUserId = objectMapper.readTree(createdUser.getResponse().getContentAsString()).path("data").path("id").asString();
		mockMvc.perform(put("/api/v1/users/" + legacyUserId + "/roles")
						.header("Authorization", "Bearer " + superAdminToken)
						.contentType("application/json")
						.content("""
								{
								  "roleIds": ["role_platform_admin"]
								}
								"""))
				.andExpect(status().isOk());

		String legacyToken = loginAndReturnToken(legacyEmail, "Legacy@12345");
		mockMvc.perform(post("/api/v1/users")
						.header("Authorization", "Bearer " + legacyToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_platform",
								  "fullName": "Blocked Platform User",
								  "email": "blocked-platform-%s@tereka.local",
								  "password": "Blocked@12345"
								}
								""".formatted(System.currentTimeMillis())))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PLATFORM_SUPER_ADMIN_REQUIRED")));
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
				.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))))
				.andExpect(jsonPath("$.data[0].privacyScope", is("summary_masked")))
				.andExpect(jsonPath("$.data[0].phone", is("+********4567")))
				.andExpect(jsonPath("$.data[0].email", is("am****@example.local")))
				.andExpect(jsonPath("$.data[0].nationalId", is("CM********4PA")));

		mockMvc.perform(get("/api/v1/members/member_green_amina")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.membershipNo", is("GVS-0001")))
				.andExpect(jsonPath("$.data.privacyScope", is("detail_full")))
				.andExpect(jsonPath("$.data.phone", is("+256701234567")))
				.andExpect(jsonPath("$.data.nationalId", is("CM9000012K4PA")))
				.andExpect(jsonPath("$.data.savingsBalance", is(900000.00)));

		mockMvc.perform(get("/api/v1/members/member_lake_peter")
						.header("Authorization", "Bearer " + saccoToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("TENANT_ACCESS_DENIED")));
	}

	@Test
	void membersAreAutoVerifiedOnRegistrationWithNoVerificationStep() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String membershipNo = "GVS-AV-" + System.currentTimeMillis();

		// No kycStatus supplied: staff enter members directly, so the record is verified on entry.
		mockMvc.perform(post("/api/v1/members")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "branchId": "branch_green_main",
								  "membershipNo": "%s",
								  "fullName": "Auto Verified",
								  "phone": "+256700555777"
								}
								""".formatted(membershipNo)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.kycStatus", is("verified")));

		// The formerly 'pending_verification' demo members are verified too.
		mockMvc.perform(get("/api/v1/members/member_green_daniel").header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.kycStatus", is("verified")));
		mockMvc.perform(get("/api/v1/members/member_green_moses").header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.kycStatus", is("verified")));
	}

	@Test
	void staffDirectoryIsAvailableToMemberManagersWithoutUsersView() throws Exception {
		// The Secretary can manage members (members:approve) but has no users:view permission;
		// the staff-directory still lets them populate the member↔staff link picker.
		String secretary = loginAndReturnToken("secretary@greenvalley.local", "Secretary@12345");
		mockMvc.perform(get("/api/v1/members/staff-directory").header("Authorization", "Bearer " + secretary))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))))
				.andExpect(jsonPath("$.data[0].fullName", notNullValue()));
	}

	@Test
	void staffCanListTenantGuarantorRequestsWithCapacityBreakdown() throws Exception {
		String admin = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		mockMvc.perform(get("/api/v1/loans/guarantor-requests").header("Authorization", "Bearer " + admin))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data[0].capacity", notNullValue()))
				.andExpect(jsonPath("$.data[0].guaranteeCeiling", notNullValue()))
				.andExpect(jsonPath("$.data[0].committedGuarantees", notNullValue()));
	}

	@Test
	void savingsHoldBlocksWithdrawalBeyondAvailableSavings() throws Exception {
		String admin = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String treasurer = loginAndReturnToken("treasurer@greenvalley.local", "Treasurer@12345");
		try {
			// Amina savings 900,000; hold 850,000 leaves only 50,000 available.
			jdbcTemplate.update("UPDATE members SET savings_hold = 850000 WHERE id = 'member_green_amina'");
			mockMvc.perform(post("/api/v1/financial-transactions")
							.header("Authorization", "Bearer " + admin)
							.contentType("application/json")
							.content("""
									{ "memberId": "member_green_amina", "type": "withdrawal", "channel": "cash", "amount": 100000, "narration": "Hold test" }
									"""))
					.andExpect(status().isConflict())
					.andExpect(jsonPath("$.error.code", is("INSUFFICIENT_SAVINGS")));
		} finally {
			jdbcTemplate.update("UPDATE members SET savings_hold = 0 WHERE id = 'member_green_amina'");
		}
	}

	@Test
	void staffLinkedToMemberCannotApproveTheirOwnTransaction() throws Exception {
		String admin = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String membershipNo = "GVS-COI-" + System.currentTimeMillis();
		String phone = "+2567" + (System.currentTimeMillis() % 100000000L);
		MvcResult createdMember = mockMvc.perform(post("/api/v1/members")
						.header("Authorization", "Bearer " + admin)
						.contentType("application/json")
						.content("""
								{ "branchId": "branch_green_main", "membershipNo": "%s", "fullName": "COI Member", "phone": "%s" }
								""".formatted(membershipNo, phone)))
				.andExpect(status().isCreated())
				.andReturn();
		String memberId = objectMapper.readTree(createdMember.getResponse().getContentAsString()).path("data").path("id").asString();
		mockMvc.perform(patch("/api/v1/members/" + memberId + "/status")
						.header("Authorization", "Bearer " + admin)
						.contentType("application/json").content("{ \"status\": \"active\" }"))
				.andExpect(status().isOk());
		try {
			mockMvc.perform(patch("/api/v1/members/" + memberId + "/staff-link")
							.header("Authorization", "Bearer " + admin)
							.contentType("application/json").content("{ \"userId\": \"user_green_treasurer\" }"))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.data.linkedUserId", is("user_green_treasurer")));

			MvcResult tx = mockMvc.perform(post("/api/v1/financial-transactions")
							.header("Authorization", "Bearer " + admin)
							.contentType("application/json")
							.content("""
									{ "memberId": "%s", "type": "savings_deposit", "channel": "bank", "amount": 100000, "narration": "COI test" }
									""".formatted(memberId)))
					.andExpect(status().isCreated())
					.andReturn();
			String txId = objectMapper.readTree(tx.getResponse().getContentAsString()).path("data").path("id").asString();

			// The treasurer IS this member, so cannot approve their own transaction.
			String treasurer = loginAndReturnToken("treasurer@greenvalley.local", "Treasurer@12345");
			mockMvc.perform(patch("/api/v1/financial-transactions/" + txId + "/status")
							.header("Authorization", "Bearer " + treasurer)
							.contentType("application/json").content("{ \"status\": \"posted\" }"))
					.andExpect(status().isConflict())
					.andExpect(jsonPath("$.error.code", is("CONFLICT_OF_INTEREST")));

			// After unlinking, the treasurer can approve it.
			mockMvc.perform(patch("/api/v1/members/" + memberId + "/staff-link")
							.header("Authorization", "Bearer " + admin)
							.contentType("application/json").content("{ \"userId\": \"\" }"))
					.andExpect(status().isOk());
			mockMvc.perform(patch("/api/v1/financial-transactions/" + txId + "/status")
							.header("Authorization", "Bearer " + treasurer)
							.contentType("application/json").content("{ \"status\": \"posted\" }"))
					.andExpect(status().isOk());
		} finally {
			mockMvc.perform(patch("/api/v1/members/" + memberId + "/staff-link")
					.header("Authorization", "Bearer " + admin)
					.contentType("application/json").content("{ \"userId\": \"\" }"));
		}
	}

	@Test
	void staffUserCanOnlyBeLinkedToOneMember() throws Exception {
		String admin = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		try {
			mockMvc.perform(patch("/api/v1/members/member_green_amina/staff-link")
							.header("Authorization", "Bearer " + admin)
							.contentType("application/json").content("{ \"userId\": \"user_green_secretary\" }"))
					.andExpect(status().isOk());
			mockMvc.perform(patch("/api/v1/members/member_green_daniel/staff-link")
							.header("Authorization", "Bearer " + admin)
							.contentType("application/json").content("{ \"userId\": \"user_green_secretary\" }"))
					.andExpect(status().isConflict())
					.andExpect(jsonPath("$.error.code", is("STAFF_ALREADY_LINKED")));

			// Unlinking frees the staff user to be linked elsewhere.
			mockMvc.perform(patch("/api/v1/members/member_green_amina/staff-link")
							.header("Authorization", "Bearer " + admin)
							.contentType("application/json").content("{ \"userId\": \"\" }"))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.data.linkedUserId", org.hamcrest.Matchers.nullValue()));
			mockMvc.perform(patch("/api/v1/members/member_green_daniel/staff-link")
							.header("Authorization", "Bearer " + admin)
							.contentType("application/json").content("{ \"userId\": \"user_green_secretary\" }"))
					.andExpect(status().isOk());
		} finally {
			mockMvc.perform(patch("/api/v1/members/member_green_daniel/staff-link")
					.header("Authorization", "Bearer " + admin)
					.contentType("application/json").content("{ \"userId\": \"\" }"));
			mockMvc.perform(patch("/api/v1/members/member_green_amina/staff-link")
					.header("Authorization", "Bearer " + admin)
					.contentType("application/json").content("{ \"userId\": \"\" }"));
		}
	}

	@Test
	void staffLinkedToMemberCannotApproveTheirOwnLoan() throws Exception {
		String admin = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		try {
			// Link the chairperson staff user to Amina: they are the same person.
			mockMvc.perform(patch("/api/v1/members/member_green_amina/staff-link")
							.header("Authorization", "Bearer " + admin)
							.contentType("application/json")
							.content("{ \"userId\": \"user_green_chairperson\" }"))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.data.linkedUserId", is("user_green_chairperson")));

			// Amina submits a small self-secured loan.
			String aminaToken = memberLoginAndReturnToken("GVS-0001", "Member@12345");
			MvcResult created = mockMvc.perform(post("/api/v1/member-auth/mobile-loans")
							.header("Authorization", "Bearer " + aminaToken)
							.contentType("application/json")
							.content("""
									{ "product": "Emergency Loan", "amount": 100000, "repaymentMonths": 12, "purpose": "COI" }
									"""))
					.andExpect(status().isCreated())
					.andReturn();
			String loanId = objectMapper.readTree(created.getResponse().getContentAsString()).path("data").path("id").asString();

			// The chairperson (who IS Amina) cannot approve her own loan.
			String chair = loginAndReturnToken("chairperson@greenvalley.local", "Chair@12345");
			mockMvc.perform(patch("/api/v1/loans/" + loanId + "/status")
							.header("Authorization", "Bearer " + chair)
							.contentType("application/json")
							.content("{ \"status\": \"approved\" }"))
					.andExpect(status().isConflict())
					.andExpect(jsonPath("$.error.code", is("CONFLICT_OF_INTEREST")));

			// A different, unlinked officer can approve it.
			mockMvc.perform(patch("/api/v1/loans/" + loanId + "/status")
							.header("Authorization", "Bearer " + admin)
							.contentType("application/json")
							.content("{ \"status\": \"approved\" }"))
					.andExpect(status().isOk());
		} finally {
			mockMvc.perform(patch("/api/v1/members/member_green_amina/staff-link")
					.header("Authorization", "Bearer " + admin)
					.contentType("application/json")
					.content("{ \"userId\": \"\" }"));
		}
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
				.andExpect(jsonPath("$.data.nationalId", is("CM1234567SMK")))
				.andExpect(jsonPath("$.data.status", is("pending_approval")))
				.andExpect(jsonPath("$.data.kycStatus", is("verified")))
				.andExpect(jsonPath("$.data.savingsBalance", is(0)))
				.andExpect(jsonPath("$.data.passwordHash").doesNotExist())
				.andReturn();

		String memberId = objectMapper.readTree(createdMember.getResponse().getContentAsString()).path("data").path("id").asString();
		String storedNationalId = jdbcTemplate.queryForObject(
				"SELECT national_id FROM members WHERE id = ?",
				String.class,
				memberId);
		org.junit.jupiter.api.Assertions.assertTrue(storedNationalId.startsWith("enc:v1:"));
		org.junit.jupiter.api.Assertions.assertNotEquals("CM1234567SMK", storedNationalId);

		mockMvc.perform(get("/api/v1/members/" + memberId)
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.nationalId", is("CM1234567SMK")));

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
				.andExpect(jsonPath("$.data[0].verificationStatus", is("verified")))
				.andExpect(jsonPath("$.data[0].retentionStatus", is("active")));

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
				.andExpect(jsonPath("$.data.retentionStatus", is("active")))
				.andExpect(jsonPath("$.data.uploadedByUserId", is("user_green_admin")))
				.andReturn();

		String documentId = objectMapper.readTree(createdDocument.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(patch("/api/v1/members/member_green_amina/documents/" + documentId + "/retention")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "retentionStatus": "review_due",
								  "retentionReason": "Signature evidence has reached periodic KYC review.",
								  "retentionReviewDueAt": "2026-08-31"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.retentionStatus", is("review_due")))
				.andExpect(jsonPath("$.data.retentionReason", is("Signature evidence has reached periodic KYC review.")))
				.andExpect(jsonPath("$.data.retentionReviewDueAt", is("2026-08-31")))
				.andExpect(jsonPath("$.data.retentionReviewedAt", notNullValue()))
				.andExpect(jsonPath("$.data.retentionActionedByUserId", is("user_green_admin")));

		mockMvc.perform(patch("/api/v1/members/member_green_amina/documents/" + documentId + "/retention")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "retentionStatus": "disposed",
								  "retentionReason": "Member replaced this signature evidence."
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.retentionStatus", is("disposed")))
				.andExpect(jsonPath("$.data.retentionStorageAction", is("demo_noop")))
				.andExpect(jsonPath("$.data.retentionStorageActionAt", notNullValue()));

		mockMvc.perform(get("/api/v1/audit-events")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].resourceType", is("member_document_retention")))
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

		mockMvc.perform(patch("/api/v1/members/member_lake_peter/documents/doc_green_amina_nin/retention")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "retentionStatus": "retained"
								}
								"""))
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

		mockMvc.perform(patch("/api/v1/members/member_green_amina/documents/doc_green_amina_nin/retention")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "retentionStatus": "lost"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_DOCUMENT_RETENTION_STATUS")));

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
				.andExpect(jsonPath("$.data.createdLoans[0].amount", is(1200000.0)))
				.andExpect(jsonPath("$.data.createdLoans[0].balance", is(900000.0)));

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
				.andExpect(jsonPath("$.data.balances.savings", is(900000.00)))
				.andExpect(jsonPath("$.data.balances.shares", is(150000.00)))
				.andExpect(jsonPath("$.data.balances.welfare", is(45000.00)))
				.andReturn();

		String memberToken = objectMapper.readTree(login.getResponse().getContentAsString()).path("data").path("token").asString();

		mockMvc.perform(get("/api/v1/member-auth/me")
						.header("Authorization", "Bearer " + memberToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.member.fullName", is("Amina Nakitende")))
				.andExpect(jsonPath("$.data.balances.savings", is(900000.00)));

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
	void memberCanUpdatePrivacyConsentsAndAuditIsWritten() throws Exception {
		String memberToken = memberLoginAndReturnToken("GVS-0001", "Member@12345");

		mockMvc.perform(patch("/api/v1/member-auth/privacy-consents")
						.header("Authorization", "Bearer " + memberToken)
						.contentType("application/json")
						.content("""
								{
								  "privacyNoticeAccepted": true,
								  "smsConsent": true,
								  "emailConsent": false,
								  "mobileMoneyConsent": true,
								  "providerDataSharingConsent": true
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.id", is("member_green_amina")))
				.andExpect(jsonPath("$.data.consentPreferences.privacyNoticeAccepted", is(true)))
				.andExpect(jsonPath("$.data.consentPreferences.smsConsent", is(true)))
				.andExpect(jsonPath("$.data.consentPreferences.emailConsent", is(false)))
				.andExpect(jsonPath("$.data.consentPreferences.mobileMoneyConsent", is(true)))
				.andExpect(jsonPath("$.data.consentPreferences.providerDataSharingConsent", is(true)))
				.andExpect(jsonPath("$.data.consentPreferences.consentUpdatedAt", notNullValue()));

		mockMvc.perform(get("/api/v1/member-auth/me")
						.header("Authorization", "Bearer " + memberToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.member.consentPreferences.emailConsent", is(false)))
				.andExpect(jsonPath("$.data.member.consentPreferences.privacyNoticeAcceptedAt", notNullValue()));

		mockMvc.perform(get("/api/v1/audit-events")
						.header("Authorization", "Bearer " + loginAndReturnToken("admin@greenvalley.local", "Sacco@12345")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].resourceType", is("member_privacy_consent")))
				.andExpect(jsonPath("$.data[0].action", is("Updated member privacy consents")));
	}

	@Test
	void memberCanSubmitAndListPrivacyRequests() throws Exception {
		String memberToken = memberLoginAndReturnToken("GVS-0001", "Member@12345");

		MvcResult created = mockMvc.perform(post("/api/v1/member-auth/privacy-requests")
						.header("Authorization", "Bearer " + memberToken)
						.contentType("application/json")
						.content("""
								{
								  "requestType": "subject_access",
								  "reason": "I need a copy of my stored SACCO profile data."
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.memberId", is("member_green_amina")))
				.andExpect(jsonPath("$.data.requestType", is("subject_access")))
				.andExpect(jsonPath("$.data.status", is("submitted")))
				.andReturn();
		String requestId = objectMapper.readTree(created.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(get("/api/v1/member-auth/privacy-requests")
						.header("Authorization", "Bearer " + memberToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].id", hasItem(requestId)))
				.andExpect(jsonPath("$.data[*].requestType", hasItem("subject_access")));

		mockMvc.perform(get("/api/v1/audit-events")
						.header("Authorization", "Bearer " + loginAndReturnToken("admin@greenvalley.local", "Sacco@12345")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].resourceType", is("member_privacy_request")))
				.andExpect(jsonPath("$.data[0].action", is("Submitted member privacy request subject_access")));
	}

	@Test
	void staffCanCompleteErasureRequestWithoutDeletingMemberRecord() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String membershipNo = "GVS-ERASURE-" + System.currentTimeMillis();

		MvcResult createdMember = mockMvc.perform(post("/api/v1/members")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_green",
								  "branchId": "branch_green_main",
								  "membershipNo": "%s",
								  "fullName": "Erasure Test Member",
								  "memberType": "individual",
								  "phone": "+256700999123",
								  "email": "erasure.test@example.local",
								  "nationalId": "CM9999999TEST",
								  "password": "Member@12345",
								  "kycStatus": "verified",
								  "joiningDate": "2026-07-18"
								}
								""".formatted(membershipNo)))
				.andExpect(status().isCreated())
				.andReturn();
		String memberId = objectMapper.readTree(createdMember.getResponse().getContentAsString()).path("data").path("id").asString();

		MvcResult createdRequest = mockMvc.perform(post("/api/v1/members/" + memberId + "/privacy-requests")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "requestType": "erasure",
								  "reason": "Member exited and requested personal data erasure."
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.requestType", is("erasure")))
				.andExpect(jsonPath("$.data.status", is("submitted")))
				.andReturn();
		String requestId = objectMapper.readTree(createdRequest.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(patch("/api/v1/members/" + memberId + "/privacy-requests/" + requestId + "/status")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "status": "completed",
								  "resolutionNote": "Redacted personal identifiers; financial records retained for statutory audit."
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status", is("completed")))
				.andExpect(jsonPath("$.data.completedAt", notNullValue()));

		mockMvc.perform(get("/api/v1/members/" + memberId)
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.membershipNo", is(membershipNo)))
				.andExpect(jsonPath("$.data.fullName", is("Former member " + membershipNo)))
				.andExpect(jsonPath("$.data.phone", is("")))
				.andExpect(jsonPath("$.data.email", is("")))
				.andExpect(jsonPath("$.data.nationalId", is("")))
				.andExpect(jsonPath("$.data.status", is("exited")))
				.andExpect(jsonPath("$.data.kycStatus", is("expired")));
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
				.andExpect(jsonPath("$.data.balances.savings", is(900000.00)))
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
								  "purpose": "Mobile medical support",
								  "guarantors": [{ "membershipNo": "GVS-0002", "pledgeAmount": 450000 }]
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
				.andExpect(jsonPath("$.data.welfareBalance", is(100000.00)));

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
								  "channel": "bank",
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

		mockMvc.perform(get("/api/v1/members/member_green_amina/statement/export.csv")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(header().string("Content-Disposition", containsString("member-statement-GVS-0001.csv")))
				.andExpect(content().contentTypeCompatibleWith("text/csv"))
				.andExpect(content().string(containsString("membershipNo,memberName,reference,type,channel,amount")))
				.andExpect(content().string(containsString("GVS-0001")));

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

		java.math.BigDecimal totalLoanBalanceBeforeRepayment = jdbcTemplate.queryForObject(
				"""
				select coalesce(sum(balance), 0)
				from loans
				where tenant_id = 'tenant_green'
				  and member_id = 'member_green_amina'
				  and balance > 0
				  and lower(status) not in ('closed', 'rejected', 'cancelled', 'written_off')
				""",
				java.math.BigDecimal.class);
		java.math.BigDecimal loanGreenBalanceBeforeRepayment = jdbcTemplate.queryForObject(
				"select balance from loans where id = 'loan_green_0001'",
				java.math.BigDecimal.class);
		java.math.BigDecimal loanGreenRepaymentTotalBefore = jdbcTemplate.queryForObject(
				"select coalesce(sum(amount), 0) from loan_repayments where loan_id = 'loan_green_0001' and status = 'posted'",
				java.math.BigDecimal.class);
		java.math.BigDecimal overpaymentAmount = totalLoanBalanceBeforeRepayment.add(java.math.BigDecimal.ONE);

		mockMvc.perform(post("/api/v1/financial-transactions")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_amina",
								  "type": "loan_repayment",
								  "channel": "cash",
								  "amount": %s,
								  "narration": "Overpayment guard"
								}
								""".formatted(overpaymentAmount.toPlainString())))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("LOAN_REPAYMENT_EXCEEDS_BALANCE")));

		mockMvc.perform(post("/api/v1/financial-transactions")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_amina",
								  "type": "loan_repayment",
								  "channel": "cash",
								  "amount": 50000,
								  "narration": "Partial cash repayment"
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.status", is("posted")));
		org.assertj.core.api.Assertions.assertThat(jdbcTemplate.queryForObject(
				"select balance from loans where id = 'loan_green_0001'",
				java.math.BigDecimal.class)).isEqualByComparingTo(loanGreenBalanceBeforeRepayment.subtract(new java.math.BigDecimal("50000.00")));
		org.assertj.core.api.Assertions.assertThat(jdbcTemplate.queryForObject(
				"select coalesce(sum(amount), 0) from loan_repayments where loan_id = 'loan_green_0001' and status = 'posted'",
				java.math.BigDecimal.class)).isEqualByComparingTo(loanGreenRepaymentTotalBefore.add(new java.math.BigDecimal("50000.00")));

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
		String currentPeriodId = ensureCurrentAccountingPeriod("tenant_green");

		try {
			MvcResult transaction = mockMvc.perform(post("/api/v1/financial-transactions")
							.header("Authorization", "Bearer " + makerToken)
							.contentType("application/json")
							.content("""
									{
									  "memberId": "member_green_amina",
									  "type": "savings_deposit",
									  "channel": "bank",
									  "amount": 20000,
									  "narration": "Closed period test"
									}
									"""))
					.andExpect(status().isCreated())
					.andReturn();
			String transactionId = objectMapper.readTree(transaction.getResponse().getContentAsString()).path("data").path("id").asString();

			mockMvc.perform(patch("/api/v1/accounting-periods/" + currentPeriodId + "/status")
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

			mockMvc.perform(patch("/api/v1/accounting-periods/" + currentPeriodId + "/status")
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
		} finally {
			mockMvc.perform(patch("/api/v1/accounting-periods/" + currentPeriodId + "/status")
							.header("Authorization", "Bearer " + makerToken)
							.contentType("application/json")
							.content("""
									{ "status": "open" }
									"""));
		}
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
		String purchaseDate = LocalDate.now().toString();
		String depreciationStartDate = LocalDate.now().plusMonths(1).withDayOfMonth(1).toString();

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
								  "purchaseDate": "%s",
								  "depreciationStartDate": "%s",
								  "channel": "bank",
								  "reference": "%s",
								  "location": "Main office"
								}
								""".formatted(purchaseDate, depreciationStartDate, assetReference)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.reference", is(assetReference)))
				.andExpect(jsonPath("$.data.status", is("active")))
				.andExpect(jsonPath("$.data.accumulatedDepreciation", is(0)))
				.andExpect(jsonPath("$.data.netBookValue", is(600000.0)));

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
				.andExpect(jsonPath("$.data.status", is("pending_approval")))
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

		mockMvc.perform(get("/api/v1/notifications/provider-evidence")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.notificationDeliveries", greaterThanOrEqualTo(2)))
				.andExpect(jsonPath("$.data.sentNotificationDeliveries", greaterThanOrEqualTo(2)))
				.andExpect(jsonPath("$.data.mobileMoney.callbacksReceived", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data.mobileMoney.callbacksPendingApproval", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data.mobileMoney.providerOptions.length()", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data.evidenceStatus", notNullValue()));
	}

	@Test
	void mobileMoneyCallbackPostsLoanRepaymentAndControlsAreEnforced() throws Exception {
		String staffToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String loanId = createApprovedAndDisbursedLoan(staffToken, 160000);
		String externalReference = "MM-LR-" + System.currentTimeMillis();

		MvcResult repaymentCallback = mockMvc.perform(post("/api/v1/integrations/mobile-money/callback")
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
				.andExpect(jsonPath("$.data.status", is("pending_approval")))
				.andReturn();
		String repaymentId = objectMapper.readTree(repaymentCallback.getResponse().getContentAsString())
				.path("data").path("resourceId").asString();

		// Member mobile-money repayments are received but not yet posted: they await approval.
		mockMvc.perform(get("/api/v1/loans/" + loanId + "/repayments")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].reference", is(externalReference)))
				.andExpect(jsonPath("$.data[0].channel", is("mobile_money")))
				.andExpect(jsonPath("$.data[0].status", is("pending_approval")));

		mockMvc.perform(get("/api/v1/loans/repayments/pending?tenantId=tenant_green")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].reference", hasItem(externalReference)));

		// A treasurer/authorised checker (not the system maker) approves it, reducing the balance.
		mockMvc.perform(post("/api/v1/loans/%s/repayments/%s/decision".formatted(loanId, repaymentId))
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{ "status": "posted" }
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status", is("posted")))
				.andExpect(jsonPath("$.data.approvedByUserId", notNullValue()));

		mockMvc.perform(get("/api/v1/loans/" + loanId + "/repayments")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].status", is("posted")));

		// The same repayment cannot be decided twice.
		mockMvc.perform(post("/api/v1/loans/%s/repayments/%s/decision".formatted(loanId, repaymentId))
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{ "status": "rejected", "reason": "Already posted" }
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("REPAYMENT_ALREADY_DECIDED")));

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
	void memberCanInitiateMobileMoneyPaymentRequest() throws Exception {
		String memberToken = memberLoginAndReturnToken("GVS-0001", "Member@12345");
		String staffToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String externalReference = "MM-REQUEST-" + System.currentTimeMillis();

		MvcResult requestResult = mockMvc.perform(post("/api/v1/integrations/mobile-money/payment-requests")
						.header("Authorization", "Bearer " + memberToken)
						.contentType("application/json")
						.content("""
								{
								  "purpose": "savings_deposit",
								  "amount": 5000,
								  "payerPhone": "+256700000001",
								  "externalReference": "%s",
								  "provider": "mtn"
								}
								""".formatted(externalReference)))
				.andExpect(status().isAccepted())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.memberId", is("member_green_amina")))
				.andExpect(jsonPath("$.data.purpose", is("savings_deposit")))
				.andExpect(jsonPath("$.data.amount", is(5000.0)))
				.andExpect(jsonPath("$.data.currencyCode", is("UGX")))
				.andExpect(jsonPath("$.data.provider", is("demo_mobile_money")))
				.andExpect(jsonPath("$.data.externalReference", is(externalReference)))
				.andExpect(jsonPath("$.data.status", is("pending_demo_callback")))
				.andExpect(jsonPath("$.data.callbackPosting", is(true)))
				.andReturn();
		String requestId = objectMapper.readTree(requestResult.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(get("/api/v1/integrations/mobile-money/payment-requests")
						.header("Authorization", "Bearer " + memberToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].externalReference", is(externalReference)))
				.andExpect(jsonPath("$.data[0].status", is("pending_demo_callback")));

		mockMvc.perform(get("/api/v1/integrations/mobile-money/payment-requests/%s/provider-status".formatted(requestId))
						.header("Authorization", "Bearer " + memberToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.externalReference", is(externalReference)))
				.andExpect(jsonPath("$.data.status", is("pending_demo_callback")))
				.andExpect(jsonPath("$.data.statusMessage", containsString("Provider status polling is not available")));

		var reconciliationSummary = mobileMoneyReconciliationJob.reconcilePendingRequests();
		org.hamcrest.MatcherAssert.assertThat(reconciliationSummary.scanned(), greaterThanOrEqualTo(1));
		org.hamcrest.MatcherAssert.assertThat(reconciliationSummary.updated(), greaterThanOrEqualTo(1));
		org.hamcrest.MatcherAssert.assertThat(reconciliationSummary.status(), is("completed"));
		Integer recordedRuns = jdbcTemplate.queryForObject("""
				SELECT COUNT(*) FROM integration_job_runs
				WHERE job_name = 'mobile_money_reconciliation'
				""", Integer.class);
		org.hamcrest.MatcherAssert.assertThat(recordedRuns, greaterThanOrEqualTo(1));

		mockMvc.perform(get("/api/v1/notifications/provider-evidence")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.mobileMoney.reconciliationSummary.scanned", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data.mobileMoney.reconciliationSummary.updated", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data.mobileMoney.reconciliationSummary.status", is("completed")))
				.andExpect(jsonPath("$.data.mobileMoney.reconciliationSummary.ranAt", notNullValue()));

		mockMvc.perform(get("/api/v1/notifications/provider-job-runs")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].jobName", is("mobile_money_reconciliation")))
				.andExpect(jsonPath("$.data[0].status", is("completed")))
				.andExpect(jsonPath("$.data[0].scanned", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data[0].updated", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data[0].finishedAt", notNullValue()));

		mockMvc.perform(get("/api/v1/notifications/provider-job-runs")
						.header("Authorization", "Bearer " + memberToken))
				.andExpect(status().isUnauthorized());

		mockMvc.perform(post("/api/v1/notifications/provider-job-runs/mobile-money-reconciliation")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isAccepted())
				.andExpect(jsonPath("$.data.status", is("completed")))
				.andExpect(jsonPath("$.data.ranAt", notNullValue()));

		mockMvc.perform(get("/api/v1/audit-events")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].action", hasItem("Ran mobile-money reconciliation manually")));

		mockMvc.perform(patch("/api/v1/integrations/mobile-money/payment-requests/%s/status".formatted(requestId))
						.header("Authorization", "Bearer " + memberToken)
						.contentType("application/json")
						.content("""
								{
								  "status": "failed",
								  "reason": "Member tokens cannot close staff exceptions."
								}
								"""))
				.andExpect(status().isUnauthorized());

		mockMvc.perform(patch("/api/v1/integrations/mobile-money/payment-requests/%s/status".formatted(requestId))
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{
								  "status": "waiting",
								  "reason": "Invalid operational status."
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_PAYMENT_REQUEST_STATUS")));

		mockMvc.perform(patch("/api/v1/integrations/mobile-money/payment-requests/%s/status".formatted(requestId))
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{
								  "status": "failed",
								  "reason": "Provider prompt expired before member confirmation."
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status", is("failed")))
				.andExpect(jsonPath("$.data.statusMessage", is("Provider prompt expired before member confirmation.")));

		mockMvc.perform(get("/api/v1/audit-events")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].action", hasItem("Marked mobile-money payment request " + externalReference + " failed")));

		mockMvc.perform(get("/api/v1/notifications/deliveries")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].eventType", hasItem("payment_request_closed")))
				.andExpect(jsonPath("$.data[*].resourceId", hasItem(requestId)))
				.andExpect(jsonPath("$.data[*].message", hasItem(containsString("Provider prompt expired before member confirmation."))));

		String postedReference = externalReference + "-POSTED";
		MvcResult postedRequestResult = mockMvc.perform(post("/api/v1/integrations/mobile-money/payment-requests")
						.header("Authorization", "Bearer " + memberToken)
						.contentType("application/json")
						.content("""
								{
								  "purpose": "savings_deposit",
								  "amount": 5000,
								  "payerPhone": "+256700000001",
								  "externalReference": "%s",
								  "provider": "mtn"
								}
								""".formatted(postedReference)))
				.andExpect(status().isAccepted())
				.andExpect(jsonPath("$.data.status", is("pending_demo_callback")))
				.andReturn();
		String postedRequestId = objectMapper.readTree(postedRequestResult.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(post("/api/v1/integrations/mobile-money/callback")
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_green",
								  "memberId": "member_green_amina",
								  "purpose": "savings_deposit",
								  "amount": 5000,
								  "externalReference": "%s",
								  "provider": "demo_mobile_money"
								}
								""".formatted(postedReference)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.status", is("pending_approval")));

		mockMvc.perform(patch("/api/v1/integrations/mobile-money/payment-requests/%s/status".formatted(postedRequestId))
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{
								  "status": "cancelled",
								  "reason": "Cannot cancel after callback posting."
								}
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("PAYMENT_REQUEST_ALREADY_POSTED")));

		mockMvc.perform(get("/api/v1/integrations/mobile-money/payment-requests")
						.header("Authorization", "Bearer " + memberToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].externalReference", is(postedReference)))
				.andExpect(jsonPath("$.data[0].status", is("posted")));

		mockMvc.perform(post("/api/v1/integrations/mobile-money/payment-requests")
						.contentType("application/json")
						.content("""
								{
								  "purpose": "savings_deposit",
								  "amount": 5000,
								  "payerPhone": "+256700000001"
								}
								"""))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.error.code", is("MEMBER_AUTH_REQUIRED")));
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
								  "purpose": "Template smoke test",
								  "guarantors": [{ "membershipNo": "GVS-0002", "pledgeAmount": 180000 }]
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
								  "chairMemberId": "member_green_amina",
								  "minutes": "Review risk dashboard and controls."
								}
								""".formatted(title)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.title", is(title)))
				.andExpect(jsonPath("$.data.meetingType", is("board")))
				.andExpect(jsonPath("$.data.chairMemberId", is("member_green_amina")))
				.andExpect(jsonPath("$.data.openResolutions", is(0)))
				.andReturn();
		String meetingId = objectMapper.readTree(createdMeeting.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(patch("/api/v1/governance-meetings/" + meetingId)
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "title": "%s Updated",
								  "meetingType": "board",
								  "scheduledAt": "2026-08-21T09:00:00Z",
								  "chairMemberId": "member_green_amina",
								  "status": "completed",
								  "minutes": "<p>Updated board minutes and decisions.</p>"
								}
								""".formatted(title)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.title", is(title + " Updated")))
				.andExpect(jsonPath("$.data.status", is("completed")))
				.andExpect(jsonPath("$.data.chairMemberId", is("member_green_amina")))
				.andExpect(jsonPath("$.data.minutes", containsString("Updated board minutes")));

		mockMvc.perform(post("/api/v1/governance-meetings/" + meetingId + "/resolutions")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "title": "Strengthen arrears review",
								  "decision": "Management to submit weekly arrears movement reports.",
								  "ownerName": "Credit Committee Secretary",
								  "ownerTitle": "Secretary",
								  "dueDate": "2026-08-31",
								  "status": "open"
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
				.andExpect(jsonPath("$.data.meetingId", is(meetingId)))
				.andExpect(jsonPath("$.data.ownerName", is("Credit Committee Secretary")))
				.andExpect(jsonPath("$.data.ownerTitle", is("Secretary")))
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
	void reconciliationSuggestsSaccoCollectionAccountWhenAccountNumberAppearsInStatementLine() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String accountId = "paymentaccount_recon_test";
		String accountNumber = "RECON-ACCT-98765";
		String statementLineId = "statement_recon_test";
		String externalReference = "RECON-UNMATCHED-0001";
		try {
			jdbcTemplate.update("""
					INSERT INTO sacco_payment_accounts
					    (id, tenant_id, channel, network, account_name, account_number, bank_name, branch, active)
					VALUES (?, 'tenant_green', 'bank', NULL, 'Green Valley SACCO', ?, 'Stanbic', 'Kampala', TRUE)
					""", accountId, accountNumber);
			jdbcTemplate.update("""
					INSERT INTO statement_lines
					    (id, tenant_id, account_code, channel, amount, external_reference, description, statement_date, imported_by_user_id)
					VALUES (?, 'tenant_green', '1010', 'bank', 424242, ?, ?, DATE '2026-07-14', 'user_green_admin')
					""", statementLineId, externalReference, "Deposit into " + accountNumber);

			mockMvc.perform(get("/api/v1/reconciliation")
							.header("Authorization", "Bearer " + token))
					.andExpect(status().isOk())
					.andExpect(jsonPath(
							"$.data.unmatchedStatementLines[?(@.externalReference=='" + externalReference + "')].suggestedCollectionAccountId",
							hasItem(accountId)))
					.andExpect(jsonPath(
							"$.data.unmatchedStatementLines[?(@.externalReference=='" + externalReference + "')].suggestedCollectionAccount",
							hasItem("Stanbic " + accountNumber)));
		} finally {
			jdbcTemplate.update("DELETE FROM statement_lines WHERE id = ?", statementLineId);
			jdbcTemplate.update("DELETE FROM sacco_payment_accounts WHERE id = ?", accountId);
		}
	}

	@Test
	void callbackListingAttributesCallbackToSaccoMobileMoneyAccountByNetwork() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String accountId = "paymentaccount_recon_mtn";
		String accountNumber = "0779494225";
		String callbackId = "callback_recon_mtn";
		String externalReference = "MTN-RECON-0001";
		try {
			jdbcTemplate.update("""
					INSERT INTO sacco_payment_accounts
					    (id, tenant_id, channel, network, account_name, account_number, active)
					VALUES (?, 'tenant_green', 'mobile_money', 'mtn', 'Green Valley SACCO', ?, TRUE)
					""", accountId, accountNumber);
			jdbcTemplate.update("""
					INSERT INTO mobile_money_callbacks
					    (id, tenant_id, member_id, purpose, amount, external_reference, provider, status, received_at)
					VALUES (?, 'tenant_green', 'member_green_amina', 'savings_deposit', 50000, ?, 'mtn_momo', 'posted', CURRENT_TIMESTAMP)
					""", callbackId, externalReference);

			mockMvc.perform(get("/api/v1/integrations/mobile-money/callbacks")
							.header("Authorization", "Bearer " + token))
					.andExpect(status().isOk())
					.andExpect(jsonPath(
							"$.data[?(@.externalReference=='" + externalReference + "')].suggestedCollectionAccountId",
							hasItem(accountId)))
					.andExpect(jsonPath(
							"$.data[?(@.externalReference=='" + externalReference + "')].suggestedCollectionAccount",
							hasItem("MTN " + accountNumber)));
		} finally {
			jdbcTemplate.update("DELETE FROM mobile_money_callbacks WHERE id = ?", callbackId);
			jdbcTemplate.update("DELETE FROM sacco_payment_accounts WHERE id = ?", accountId);
		}
	}

	@Test
	void chairpersonReviewsAndMaintainsFundingSourceRegisterWithTenantIsolation() throws Exception {
		String chairToken = loginAndReturnToken("chairperson@greenvalley.local", "Chair@12345");
		String lakeSourceId = "fundingsource_lake_seed";
		String createdId = null;
		try {
			// A funding source belonging to another SACCO must never be visible or editable here.
			jdbcTemplate.update("""
					INSERT INTO sacco_funding_sources
					    (id, tenant_id, source_type, provider, amount, currency_code, status, recorded_by_user_id)
					VALUES (?, 'tenant_lake', 'grant', 'Other Donor', 1000000, 'UGX', 'active', 'user_green_admin')
					""", lakeSourceId);

			// Chairperson adds a funding source.
			String createBody = """
					{"sourceType":"external_borrowing","provider":"Centenary Bank","amount":50000000,
					 "currencyCode":"UGX","reference":"LOAN-2026-01","dateReceived":"2026-06-01","status":"active",
					 "notes":"5-year development facility"}
					""";
			var createResult = mockMvc.perform(post("/api/v1/funding-sources")
							.header("Authorization", "Bearer " + chairToken)
							.contentType("application/json")
							.content(createBody))
					.andExpect(status().isCreated())
					.andExpect(jsonPath("$.data.sourceType", is("external_borrowing")))
					.andExpect(jsonPath("$.data.amount", org.hamcrest.Matchers.closeTo(50000000.0, 0.001)))
					.andExpect(jsonPath("$.data.tenantId", is("tenant_green")))
					.andReturn();
			createdId = objectMapper.readTree(createResult.getResponse().getContentAsString())
					.path("data").path("id").asText();

			// Chairperson edits it (amount + status).
			mockMvc.perform(patch("/api/v1/funding-sources/" + createdId)
							.header("Authorization", "Bearer " + chairToken)
							.contentType("application/json")
							.content("""
									{"sourceType":"external_borrowing","provider":"Centenary Bank","amount":45000000,
									 "currencyCode":"UGX","status":"closed"}
									"""))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.data.amount", org.hamcrest.Matchers.closeTo(45000000.0, 0.001)))
					.andExpect(jsonPath("$.data.status", is("closed")));

			// The register lists only this SACCO's sources.
			mockMvc.perform(get("/api/v1/funding-sources").header("Authorization", "Bearer " + chairToken))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))))
					.andExpect(jsonPath("$.data[*].id", hasItem(createdId)));

			// Editing another SACCO's source is not found (tenant isolation).
			mockMvc.perform(patch("/api/v1/funding-sources/" + lakeSourceId)
							.header("Authorization", "Bearer " + chairToken)
							.contentType("application/json")
							.content("{\"sourceType\":\"grant\",\"amount\":1}"))
					.andExpect(status().isNotFound())
					.andExpect(jsonPath("$.error.code", is("FUNDING_SOURCE_NOT_FOUND")));

			// Invalid source type is rejected.
			mockMvc.perform(post("/api/v1/funding-sources")
							.header("Authorization", "Bearer " + chairToken)
							.contentType("application/json")
							.content("{\"sourceType\":\"lottery\",\"amount\":1000}"))
					.andExpect(status().isBadRequest())
					.andExpect(jsonPath("$.error.code", is("INVALID_FUNDING_SOURCE_TYPE")));

			// A user without finance-source:view (platform admin) cannot read the register.
			mockMvc.perform(get("/api/v1/funding-sources").header("Authorization", "Bearer " + loginAndReturnToken()))
					.andExpect(status().isForbidden());
		} finally {
			if (createdId != null) jdbcTemplate.update("DELETE FROM sacco_funding_sources WHERE id = ?", createdId);
			jdbcTemplate.update("DELETE FROM sacco_funding_sources WHERE id = ?", lakeSourceId);
		}
	}

	@Test
	void adminConfiguresCustomFundTypeAndCanCreateAProductOfThatFund() throws Exception {
		String adminToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String createdFundId = null;
		String productCode = "BURIAL-MONTHLY-" + System.currentTimeMillis();
		try {
			// The three built-in funds are seeded and listed.
			mockMvc.perform(get("/api/v1/fund-types").header("Authorization", "Bearer " + adminToken))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.data[*].code", hasItem("savings")))
					.andExpect(jsonPath("$.data[*].code", hasItem("welfare")))
					.andExpect(jsonPath("$.data[*].tenantId", everyItem(is("tenant_green"))));

			// A product of an unregistered fund type is rejected before the fund exists.
			mockMvc.perform(post("/api/v1/financial-products")
							.header("Authorization", "Bearer " + adminToken)
							.contentType("application/json")
							.content("{\"productType\":\"burial\",\"code\":\"" + productCode + "\",\"name\":\"Burial monthly\",\"contributionAmount\":5000,\"minimumBalance\":0}"))
					.andExpect(status().isBadRequest())
					.andExpect(jsonPath("$.error.code", is("INVALID_PRODUCT_TYPE")));

			// Admin creates a custom Burial fund (behaves like welfare).
			var created = mockMvc.perform(post("/api/v1/fund-types")
							.header("Authorization", "Bearer " + adminToken)
							.contentType("application/json")
							.content("{\"code\":\"burial\",\"name\":\"Burial Fund\",\"basis\":\"welfare\",\"description\":\"Bereavement support\"}"))
					.andExpect(status().isCreated())
					.andExpect(jsonPath("$.data.code", is("burial")))
					.andExpect(jsonPath("$.data.basis", is("welfare")))
					.andExpect(jsonPath("$.data.system", is(false)))
					.andReturn();
			createdFundId = objectMapper.readTree(created.getResponse().getContentAsString()).path("data").path("id").asText();

			// Now a product of the custom fund type is accepted.
			mockMvc.perform(post("/api/v1/financial-products")
							.header("Authorization", "Bearer " + adminToken)
							.contentType("application/json")
							.content("{\"productType\":\"burial\",\"code\":\"" + productCode + "\",\"name\":\"Burial monthly\",\"contributionAmount\":5000,\"minimumBalance\":0}"))
					.andExpect(status().isCreated())
					.andExpect(jsonPath("$.data.productType", is("burial")));

			// Built-in funds cannot be deactivated.
			mockMvc.perform(patch("/api/v1/fund-types/fundtype_tenant_green_savings")
							.header("Authorization", "Bearer " + adminToken)
							.contentType("application/json")
							.content("{\"name\":\"Savings\",\"active\":false}"))
					.andExpect(status().isConflict())
					.andExpect(jsonPath("$.error.code", is("SYSTEM_FUND_TYPE_LOCKED")));

			// A user without fund-types:view (platform admin) cannot read the registry.
			mockMvc.perform(get("/api/v1/fund-types").header("Authorization", "Bearer " + loginAndReturnToken()))
					.andExpect(status().isForbidden());
		} finally {
			jdbcTemplate.update("DELETE FROM financial_products WHERE tenant_id = 'tenant_green' AND code = ?", productCode);
			if (createdFundId != null) jdbcTemplate.update("DELETE FROM sacco_fund_types WHERE id = ?", createdFundId);
		}
	}

	@Test
	void newTenantIsSeededWithTheThreeBuiltInFundTypes() throws Exception {
		String platformToken = loginAndReturnToken();
		String unique = String.valueOf(System.currentTimeMillis());
		String abbreviation = ("FT" + unique.substring(unique.length() - 4)).toUpperCase();
		String tenantId = null;
		try {
			var created = mockMvc.perform(post("/api/v1/tenants")
							.header("Authorization", "Bearer " + platformToken)
							.contentType("application/json")
							.content("""
									{
									  "name": "Fund Seed SACCO",
									  "abbreviation": "%s",
									  "registrationNo": "COOP-FUND-%s",
									  "district": "Kampala",
									  "parish": "Central",
									  "village": "Zone",
									  "contactNumber": "+256701234000",
									  "memberRange": "100-250",
									  "country": "Uganda",
									  "localeCode": "en-UG",
									  "currencyCode": "UGX",
									  "currencyDigits": 0,
									  "licenseExpiry": "2027-12-31",
									  "packageId": "starter",
									  "paymentStatus": "paid"
									}
									""".formatted(abbreviation, unique)))
					.andExpect(status().isCreated())
					.andReturn();
			tenantId = objectMapper.readTree(created.getResponse().getContentAsString()).path("data").path("id").asText();

			Integer systemFunds = jdbcTemplate.queryForObject(
					"SELECT COUNT(*) FROM sacco_fund_types WHERE tenant_id = ? AND is_system = TRUE", Integer.class, tenantId);
			org.hamcrest.MatcherAssert.assertThat(systemFunds, is(3));
			Integer savings = jdbcTemplate.queryForObject(
					"SELECT COUNT(*) FROM sacco_fund_types WHERE tenant_id = ? AND code = 'savings'", Integer.class, tenantId);
			org.hamcrest.MatcherAssert.assertThat(savings, is(1));
		} finally {
			if (tenantId != null) jdbcTemplate.update("DELETE FROM sacco_fund_types WHERE tenant_id = ?", tenantId);
		}
	}

	@Test
	void platformBillingComposesBaseSubscriptionWithAddOnRevenueAvenues() throws Exception {
		String platformToken = loginAndReturnToken();
		String addedItemId = null;
		try {
			// Catalog exposes the add-on rate card.
			mockMvc.perform(get("/api/v1/platform-billing/catalog").header("Authorization", "Bearer " + platformToken))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.data[*].code", hasItem("addon_advanced_reporting")))
					.andExpect(jsonPath("$.data[*].code", hasItem("sms_rate")));

			// The composed bill for Green Valley = base subscription + its seeded add-ons.
			mockMvc.perform(get("/api/v1/platform-billing/summary?tenantId=tenant_green").header("Authorization", "Bearer " + platformToken))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.data.baseSubscription", org.hamcrest.Matchers.closeTo(500000.0, 0.001)))
					.andExpect(jsonPath("$.data.lines[?(@.description=='Advanced reporting & analytics')].amount", hasItem(org.hamcrest.Matchers.closeTo(600000.0, 0.001))))
					.andExpect(jsonPath("$.data.lines[?(@.description=='Premium support (priority SLA)')].amount", hasItem(org.hamcrest.Matchers.closeTo(1000000.0, 0.001))))
					.andExpect(jsonPath("$.data.total", greaterThanOrEqualTo(2100000.0)));

			// Adding an API-access add-on increases the composed total by its rate.
			var added = mockMvc.perform(post("/api/v1/platform-billing/items")
							.header("Authorization", "Bearer " + platformToken)
							.contentType("application/json")
							.content("{\"tenantId\":\"tenant_green\",\"catalogCode\":\"addon_api_access\"}"))
					.andExpect(status().isCreated())
					.andExpect(jsonPath("$.data.amount", org.hamcrest.Matchers.closeTo(900000.0, 0.001)))
					.andReturn();
			addedItemId = objectMapper.readTree(added.getResponse().getContentAsString()).path("data").path("id").asText();

			mockMvc.perform(get("/api/v1/platform-billing/summary?tenantId=tenant_green").header("Authorization", "Bearer " + platformToken))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.data.lines[?(@.description=='API access')].amount", hasItem(org.hamcrest.Matchers.closeTo(900000.0, 0.001))))
					.andExpect(jsonPath("$.data.total", greaterThanOrEqualTo(3000000.0)));

			// A SACCO user cannot see platform billing.
			String saccoToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
			mockMvc.perform(get("/api/v1/platform-billing/catalog").header("Authorization", "Bearer " + saccoToken))
					.andExpect(status().isForbidden());
		} finally {
			if (addedItemId != null) jdbcTemplate.update("DELETE FROM tenant_billing_items WHERE id = ?", addedItemId);
		}
	}

	@Test
	void saccoBroadcastFansOutAcrossChannelsAndAppearsInRepositoryAndWhatsAppIsBilled() throws Exception {
		String staffToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		// A SACCO admin broadcasts a message to all members.
		mockMvc.perform(post("/api/v1/notifications/messages/broadcast")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("{\"title\":\"Annual general meeting\",\"body\":\"The AGM is on Saturday at 10am.\"}"))
				.andExpect(status().isAccepted())
				.andExpect(jsonPath("$.data.recipients", greaterThanOrEqualTo(1)));

		// It is stored in the consolidated message repository and classified as a SACCO message.
		mockMvc.perform(get("/api/v1/notifications/messages?category=sacco_message")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].title", hasItem("Annual general meeting")))
				.andExpect(jsonPath("$.data[*].category", everyItem(is("sacco_message"))));

		// It fanned out across the enabled channels, including the new WhatsApp and mobile-push channels.
		mockMvc.perform(get("/api/v1/notifications/deliveries")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].channel", hasItem("whatsapp")))
				.andExpect(jsonPath("$.data[*].channel", hasItem("push")));

		// WhatsApp is metered as charged usage in the composed platform bill (SMS + WhatsApp are charged).
		String platformToken = loginAndReturnToken();
		mockMvc.perform(get("/api/v1/platform-billing/summary?tenantId=tenant_green")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.lines[*].category", hasItem("whatsapp_rate")));

		// Empty content is rejected.
		mockMvc.perform(post("/api/v1/notifications/messages/broadcast")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("{\"title\":\"\",\"body\":\"\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("MESSAGE_CONTENT_REQUIRED")));
	}

	@Test
	void saccoAndMemberControlNotificationChannelsAndFanOutRespectsThem() throws Exception {
		String staffToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		try {
			// Default: channels enabled at SACCO level.
			mockMvc.perform(get("/api/v1/notification-channels").header("Authorization", "Bearer " + staffToken))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.data.whatsapp", is(true)))
					.andExpect(jsonPath("$.data.sms", is(true)));

			// SACCO disables WhatsApp for cost control.
			mockMvc.perform(patch("/api/v1/notification-channels/whatsapp")
							.header("Authorization", "Bearer " + staffToken)
							.contentType("application/json").content("{\"enabled\":false}"))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.data.whatsapp", is(false)));

			// Unknown channel is rejected.
			mockMvc.perform(patch("/api/v1/notification-channels/telegram")
							.header("Authorization", "Bearer " + staffToken)
							.contentType("application/json").content("{\"enabled\":true}"))
					.andExpect(status().isBadRequest())
					.andExpect(jsonPath("$.error.code", is("UNKNOWN_CHANNEL")));

			// A member opts out of push; the SACCO-disabled WhatsApp also reads as off for the member.
			String memberToken = memberLoginAndReturnToken("GVS-0001", "Member@12345");
			mockMvc.perform(put("/api/v1/member-auth/notification-preferences")
							.header("Authorization", "Bearer " + memberToken)
							.contentType("application/json").content("{\"channel\":\"push\",\"enabled\":false}"))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.data.push", is(false)))
					.andExpect(jsonPath("$.data.whatsapp", is(false)));

			mockMvc.perform(get("/api/v1/member-auth/notification-preferences")
							.header("Authorization", "Bearer " + memberToken))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.data.push", is(false)));
		} finally {
			// Restore so other tests that assert WhatsApp fan-out / billing are unaffected.
			mockMvc.perform(patch("/api/v1/notification-channels/whatsapp")
					.header("Authorization", "Bearer " + staffToken)
					.contentType("application/json").content("{\"enabled\":true}"));
			jdbcTemplate.update("DELETE FROM notification_channel_preferences WHERE member_id <> '' AND channel = 'push'");
		}
	}

	@Test
	void memberDuesAssignPayAndLifecycle() throws Exception {
		String staffToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String membershipId = null;
		try {
			// Staff assign a membership: it starts pending payment.
			MvcResult assigned = mockMvc.perform(post("/api/v1/member-subscriptions")
							.header("Authorization", "Bearer " + staffToken)
							.contentType("application/json")
							.content("{\"memberId\":\"member_green_amina\",\"planName\":\"Test dues\",\"amount\":40000,\"billingPeriod\":\"annual\"}"))
					.andExpect(status().isCreated())
					.andExpect(jsonPath("$.data.status", is("pending_payment")))
					.andReturn();
			membershipId = objectMapper.readTree(assigned.getResponse().getContentAsString()).path("data").path("id").asText();

			// Full dues payment activates it.
			mockMvc.perform(post("/api/v1/member-subscriptions/" + membershipId + "/payments")
							.header("Authorization", "Bearer " + staffToken)
							.contentType("application/json").content("{\"amount\":40000}"))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.data.status", is("active")));

			// The member can see their membership through the portal.
			String memberToken = memberLoginAndReturnToken("GVS-0001", "Member@12345");
			mockMvc.perform(get("/api/v1/member-auth/membership").header("Authorization", "Bearer " + memberToken))
					.andExpect(status().isOk());

			// A lapsed membership is expired by the job.
			jdbcTemplate.update("UPDATE member_subscriptions SET status = 'active', last_reminder_on = NULL, expiry = ? WHERE id = ?",
					java.sql.Date.valueOf(java.time.LocalDate.now().minusDays(30)), membershipId);
			org.junit.jupiter.api.Assertions.assertTrue(memberSubscriptionService.expireLapsed() >= 1);
			org.junit.jupiter.api.Assertions.assertEquals("expired",
					jdbcTemplate.queryForObject("SELECT status FROM member_subscriptions WHERE id = ?", String.class, membershipId));

			// A membership expiring soon triggers exactly one reminder per day.
			jdbcTemplate.update("UPDATE member_subscriptions SET status = 'active', last_reminder_on = NULL, expiry = ? WHERE id = ?",
					java.sql.Date.valueOf(java.time.LocalDate.now().plusDays(5)), membershipId);
			org.junit.jupiter.api.Assertions.assertTrue(memberSubscriptionService.sendExpiryReminders() >= 1);
			org.junit.jupiter.api.Assertions.assertEquals(0, memberSubscriptionService.sendExpiryReminders());

			// Dunning: a membership lapsed but still within grace triggers an escalated overdue reminder.
			jdbcTemplate.update("UPDATE member_subscriptions SET status = 'active', last_reminder_on = NULL, expiry = ? WHERE id = ?",
					java.sql.Date.valueOf(java.time.LocalDate.now().minusDays(3)), membershipId);
			org.junit.jupiter.api.Assertions.assertTrue(memberSubscriptionService.sendExpiryReminders() >= 1);
		} finally {
			if (membershipId != null) {
				jdbcTemplate.update("DELETE FROM member_subscriptions WHERE id = ?", membershipId);
			}
		}
	}

	@Test
	void chairpersonTransfersSavingsUnderMakerCheckerAndRunsAGroupDeduction() throws Exception {
		String treasurerToken = loginAndReturnToken("treasurer@greenvalley.local", "Treasurer@12345"); // maker
		String chairToken = loginAndReturnToken("chairperson@greenvalley.local", "Chair@12345"); // checker
		String adminToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345"); // both roles
		java.math.BigDecimal originalSavings = jdbcTemplate.queryForObject(
				"SELECT savings_balance FROM members WHERE id = 'member_green_amina'", java.math.BigDecimal.class);
		java.math.BigDecimal originalShares = jdbcTemplate.queryForObject(
				"SELECT shares_balance FROM members WHERE id = 'member_green_amina'", java.math.BigDecimal.class);
		try {
			jdbcTemplate.update("UPDATE members SET savings_balance = 100000 WHERE id = 'member_green_amina'");

			// Treasurer (maker) initiates a savings -> shares transfer.
			MvcResult created = mockMvc.perform(post("/api/v1/savings-transfers")
							.header("Authorization", "Bearer " + treasurerToken)
							.contentType("application/json")
							.content("{\"sourceMemberId\":\"member_green_amina\",\"amount\":30000,\"destinationType\":\"own_fund\",\"destinationFundCode\":\"shares\",\"reason\":\"Reallocation\"}"))
					.andExpect(status().isCreated())
					.andExpect(jsonPath("$.data.status", is("pending")))
					.andReturn();
			String transferId = objectMapper.readTree(created.getResponse().getContentAsString()).path("data").path("id").asText();

			// Money-away destination requires a member authorization reference.
			mockMvc.perform(post("/api/v1/savings-transfers")
							.header("Authorization", "Bearer " + treasurerToken)
							.contentType("application/json")
							.content("{\"sourceMemberId\":\"member_green_amina\",\"amount\":1000,\"destinationType\":\"sacco_income\",\"reason\":\"Fee\"}"))
					.andExpect(status().isBadRequest())
					.andExpect(jsonPath("$.error.code", is("AUTHORIZATION_REQUIRED")));

			// Maker-checker: an admin (both roles) cannot approve their own transfer.
			MvcResult adminCreated = mockMvc.perform(post("/api/v1/savings-transfers")
							.header("Authorization", "Bearer " + adminToken)
							.contentType("application/json")
							.content("{\"sourceMemberId\":\"member_green_amina\",\"amount\":10000,\"destinationType\":\"own_fund\",\"destinationFundCode\":\"welfare\",\"reason\":\"Test\"}"))
					.andExpect(status().isCreated()).andReturn();
			String adminTransferId = objectMapper.readTree(adminCreated.getResponse().getContentAsString()).path("data").path("id").asText();
			mockMvc.perform(patch("/api/v1/savings-transfers/" + adminTransferId + "/decision")
							.header("Authorization", "Bearer " + adminToken)
							.contentType("application/json").content("{\"status\":\"posted\"}"))
					.andExpect(status().isConflict())
					.andExpect(jsonPath("$.error.code", is("MAKER_CHECKER_REQUIRED")));

			// Chairperson (checker) approves the treasurer's transfer, applying the movement.
			mockMvc.perform(patch("/api/v1/savings-transfers/" + transferId + "/decision")
							.header("Authorization", "Bearer " + chairToken)
							.contentType("application/json").content("{\"status\":\"posted\"}"))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.data.status", is("posted")));

			org.junit.jupiter.api.Assertions.assertEquals(0, jdbcTemplate.queryForObject(
					"SELECT savings_balance FROM members WHERE id = 'member_green_amina'", java.math.BigDecimal.class)
					.compareTo(new java.math.BigDecimal("70000.00")));

			// Group deduction (a levy to SACCO income) requires a board/AGM resolution reference.
			mockMvc.perform(post("/api/v1/savings-transfers/group-deduction")
							.header("Authorization", "Bearer " + treasurerToken)
							.contentType("application/json")
							.content("{\"memberIds\":[\"member_green_amina\"],\"amount\":5000,\"destinationType\":\"sacco_income\",\"reason\":\"Group levy\"}"))
					.andExpect(status().isBadRequest())
					.andExpect(jsonPath("$.error.code", is("RESOLUTION_REQUIRED")));

			MvcResult batch = mockMvc.perform(post("/api/v1/savings-transfers/group-deduction")
							.header("Authorization", "Bearer " + treasurerToken)
							.contentType("application/json")
							.content("{\"memberIds\":[\"member_green_amina\"],\"amount\":5000,\"destinationType\":\"sacco_income\",\"reason\":\"Group levy\",\"resolutionReference\":\"AGM-2026-01\"}"))
					.andExpect(status().isCreated())
					.andExpect(jsonPath("$.data.created", is(1)))
					.andReturn();
			String batchTransferId = objectMapper.readTree(batch.getResponse().getContentAsString()).path("data").path("transfers").path(0).path("id").asText();
			mockMvc.perform(patch("/api/v1/savings-transfers/" + batchTransferId + "/decision")
							.header("Authorization", "Bearer " + chairToken)
							.contentType("application/json").content("{\"status\":\"posted\"}"))
					.andExpect(status().isOk());

			org.junit.jupiter.api.Assertions.assertEquals(0, jdbcTemplate.queryForObject(
					"SELECT savings_balance FROM members WHERE id = 'member_green_amina'", java.math.BigDecimal.class)
					.compareTo(new java.math.BigDecimal("65000.00")));

			// Chairperson reverses the first (savings -> shares) transfer, restoring savings.
			mockMvc.perform(post("/api/v1/savings-transfers/" + transferId + "/reverse")
							.header("Authorization", "Bearer " + chairToken)
							.contentType("application/json").content("{}"))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.data.status", is("reversed")));
			org.junit.jupiter.api.Assertions.assertEquals(0, jdbcTemplate.queryForObject(
					"SELECT savings_balance FROM members WHERE id = 'member_green_amina'", java.math.BigDecimal.class)
					.compareTo(new java.math.BigDecimal("95000.00")));
		} finally {
			jdbcTemplate.update("DELETE FROM savings_transfers WHERE source_member_id = 'member_green_amina'");
			jdbcTemplate.update("UPDATE members SET savings_balance = ?, shares_balance = ? WHERE id = 'member_green_amina'", originalSavings, originalShares);
		}
	}

	@Test
	void highValueSavingsTransferRequiresTwoDistinctApprovals() throws Exception {
		String treasurerToken = loginAndReturnToken("treasurer@greenvalley.local", "Treasurer@12345");
		String chairToken = loginAndReturnToken("chairperson@greenvalley.local", "Chair@12345");
		String adminToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		java.math.BigDecimal originalSavings = jdbcTemplate.queryForObject(
				"SELECT savings_balance FROM members WHERE id = 'member_green_amina'", java.math.BigDecimal.class);
		java.math.BigDecimal originalShares = jdbcTemplate.queryForObject(
				"SELECT shares_balance FROM members WHERE id = 'member_green_amina'", java.math.BigDecimal.class);
		try {
			jdbcTemplate.update("UPDATE members SET savings_balance = 10000000 WHERE id = 'member_green_amina'");

			// A high-value transfer (>= 5,000,000) also needs a member authorization (>= 1,000,000).
			MvcResult created = mockMvc.perform(post("/api/v1/savings-transfers")
							.header("Authorization", "Bearer " + treasurerToken)
							.contentType("application/json")
							.content("{\"sourceMemberId\":\"member_green_amina\",\"amount\":5000000,\"destinationType\":\"own_fund\",\"destinationFundCode\":\"shares\",\"authorizationReference\":\"MANDATE-1\",\"reason\":\"Big reallocation\"}"))
					.andExpect(status().isCreated())
					.andReturn();
			String transferId = objectMapper.readTree(created.getResponse().getContentAsString()).path("data").path("id").asText();

			// First approval moves it to awaiting a second approval (not yet posted).
			mockMvc.perform(patch("/api/v1/savings-transfers/" + transferId + "/decision")
							.header("Authorization", "Bearer " + chairToken)
							.contentType("application/json").content("{\"status\":\"posted\"}"))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.data.status", is("awaiting_second_approval")));

			// The same checker cannot give the second approval.
			mockMvc.perform(patch("/api/v1/savings-transfers/" + transferId + "/decision")
							.header("Authorization", "Bearer " + chairToken)
							.contentType("application/json").content("{\"status\":\"posted\"}"))
					.andExpect(status().isConflict())
					.andExpect(jsonPath("$.error.code", is("SECOND_APPROVER_REQUIRED")));

			// A second, different checker posts it.
			mockMvc.perform(patch("/api/v1/savings-transfers/" + transferId + "/decision")
							.header("Authorization", "Bearer " + adminToken)
							.contentType("application/json").content("{\"status\":\"posted\"}"))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.data.status", is("posted")));

			org.junit.jupiter.api.Assertions.assertEquals(0, jdbcTemplate.queryForObject(
					"SELECT savings_balance FROM members WHERE id = 'member_green_amina'", java.math.BigDecimal.class)
					.compareTo(new java.math.BigDecimal("5000000.00")));
		} finally {
			jdbcTemplate.update("DELETE FROM savings_transfers WHERE source_member_id = 'member_green_amina'");
			jdbcTemplate.update("UPDATE members SET savings_balance = ?, shares_balance = ? WHERE id = 'member_green_amina'", originalSavings, originalShares);
		}
	}

	@Test
	void memberResetsPasswordFreeViaEmailAndPaidViaSms() throws Exception {
		try {
			// FREE email path: the reset code is issued immediately.
			MvcResult emailReq = mockMvc.perform(post("/api/v1/member-auth/password-reset/request")
							.contentType("application/json")
							.content("{\"identifier\":\"GVS-0001\",\"channel\":\"email\"}"))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.data.paymentRequired", is(false)))
					.andReturn();
			String emailToken = objectMapper.readTree(emailReq.getResponse().getContentAsString()).path("data").path("resetToken").asText();
			org.junit.jupiter.api.Assertions.assertTrue(emailToken != null && !emailToken.isBlank());
			mockMvc.perform(post("/api/v1/member-auth/password-reset/confirm")
							.contentType("application/json")
							.content("{\"token\":\"" + emailToken + "\",\"newPassword\":\"NewMember@123\"}"))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.data.reset", is(true)));
			memberLoginAndReturnToken("GVS-0001", "NewMember@123");

			// PAID SMS path: a code is issued but not usable until the UGX 500 fee is paid.
			MvcResult smsReq = mockMvc.perform(post("/api/v1/member-auth/password-reset/request")
							.contentType("application/json")
							.content("{\"identifier\":\"GVS-0001\",\"channel\":\"sms\"}"))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.data.paymentRequired", is(true)))
					.andExpect(jsonPath("$.data.amount", is(500)))
					.andReturn();
			var smsData = objectMapper.readTree(smsReq.getResponse().getContentAsString()).path("data");
			String smsToken = smsData.path("resetToken").asText();
			String reference = smsData.path("externalReference").asText();

			// Confirming before paying is rejected.
			mockMvc.perform(post("/api/v1/member-auth/password-reset/confirm")
							.contentType("application/json")
							.content("{\"token\":\"" + smsToken + "\",\"newPassword\":\"SmsMember@123\"}"))
					.andExpect(status().isBadRequest())
					.andExpect(jsonPath("$.error.code", is("INVALID_RESET_TOKEN")));

			// Pay the fee via mobile money — the callback activates the reset.
			mockMvc.perform(post("/api/v1/integrations/mobile-money/callback")
							.contentType("application/json")
							.content("{\"tenantId\":\"tenant_green\",\"memberIdentifier\":\"GVS-0001\",\"purpose\":\"password_reset_sms\",\"amount\":500,\"externalReference\":\"" + reference + "\",\"providerPayload\":{\"phone\":\"+256700000001\"}}"))
					.andExpect(status().isCreated())
					.andExpect(jsonPath("$.data.purpose", is("password_reset_sms")))
					.andExpect(jsonPath("$.data.resourceType", is("member_password_reset")));

			// Now the reset completes.
			mockMvc.perform(post("/api/v1/member-auth/password-reset/confirm")
							.contentType("application/json")
							.content("{\"token\":\"" + smsToken + "\",\"newPassword\":\"SmsMember@123\"}"))
					.andExpect(status().isOk());
			memberLoginAndReturnToken("GVS-0001", "SmsMember@123");
		} finally {
			// Restore the seeded password so other tests still authenticate as this member.
			MvcResult restoreReq = mockMvc.perform(post("/api/v1/member-auth/password-reset/request")
							.contentType("application/json")
							.content("{\"identifier\":\"GVS-0001\",\"channel\":\"email\"}"))
					.andReturn();
			String restoreToken = objectMapper.readTree(restoreReq.getResponse().getContentAsString()).path("data").path("resetToken").asText();
			if (restoreToken != null && !restoreToken.isBlank()) {
				mockMvc.perform(post("/api/v1/member-auth/password-reset/confirm")
						.contentType("application/json")
						.content("{\"token\":\"" + restoreToken + "\",\"newPassword\":\"Member@12345\"}"));
			}
			jdbcTemplate.update("DELETE FROM mobile_money_callbacks WHERE resource_type = 'member_password_reset'");
			jdbcTemplate.update("DELETE FROM statement_lines WHERE description = 'Mobile-money SMS password-reset fee'");
			jdbcTemplate.update("DELETE FROM member_password_reset_requests WHERE member_id = 'member_green_amina'");
		}
	}

	@Test
	void memberPaysMembershipDuesViaMobileMoney() throws Exception {
		String staffToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String memberToken = memberLoginAndReturnToken("GVS-0001", "Member@12345");
		String membershipId = null;
		String reference = "MM-DUES-" + System.currentTimeMillis();
		try {
			// Staff assigns a fresh dues membership (pending payment).
			MvcResult assigned = mockMvc.perform(post("/api/v1/member-subscriptions")
							.header("Authorization", "Bearer " + staffToken)
							.contentType("application/json")
							.content("{\"memberId\":\"member_green_amina\",\"planName\":\"MoMo dues\",\"amount\":30000,\"billingPeriod\":\"annual\"}"))
					.andExpect(status().isCreated())
					.andExpect(jsonPath("$.data.status", is("pending_payment")))
					.andReturn();
			membershipId = objectMapper.readTree(assigned.getResponse().getContentAsString()).path("data").path("id").asText();

			// The member initiates a mobile-money dues payment.
			mockMvc.perform(post("/api/v1/integrations/mobile-money/payment-requests")
							.header("Authorization", "Bearer " + memberToken)
							.contentType("application/json")
							.content("{\"purpose\":\"membership_dues\",\"amount\":30000,\"payerPhone\":\"+256700000001\",\"externalReference\":\"" + reference + "\",\"provider\":\"mtn\"}"))
					.andExpect(status().isAccepted());

			// The provider callback confirms it; dues apply directly to the membership.
			mockMvc.perform(post("/api/v1/integrations/mobile-money/callback")
							.contentType("application/json")
							.content("{\"tenantId\":\"tenant_green\",\"memberIdentifier\":\"GVS-0001\",\"purpose\":\"membership_dues\",\"amount\":30000,\"externalReference\":\"" + reference + "\",\"providerPayload\":{\"phone\":\"+256700000001\"}}"))
					.andExpect(status().isCreated())
					.andExpect(jsonPath("$.data.purpose", is("membership_dues")))
					.andExpect(jsonPath("$.data.resourceType", is("member_subscription")))
					.andExpect(jsonPath("$.data.status", is("posted")));

			// The member's membership is now active and fully paid.
			mockMvc.perform(get("/api/v1/member-auth/membership").header("Authorization", "Bearer " + memberToken))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.data.status", is("active")))
					.andExpect(jsonPath("$.data.balanceDue", org.hamcrest.Matchers.closeTo(0.0, 0.001)));
		} finally {
			jdbcTemplate.update("DELETE FROM statement_lines WHERE tenant_id = 'tenant_green' AND description = 'Mobile-money membership dues'");
			jdbcTemplate.update("DELETE FROM mobile_money_callbacks WHERE external_reference = ?", reference);
			jdbcTemplate.update("DELETE FROM mobile_money_payment_requests WHERE external_reference = ?", reference);
			if (membershipId != null) {
				jdbcTemplate.update("DELETE FROM member_subscriptions WHERE id = ?", membershipId);
			}
		}
	}

	@Test
	void subscriptionLifecycleExpiresLapsedRemindsBeforeExpiryAndExposesState() throws Exception {
		java.sql.Date originalExpiry = jdbcTemplate.queryForObject(
				"SELECT expiry FROM subscriptions WHERE tenant_id = 'tenant_green'", java.sql.Date.class);
		String originalStatus = jdbcTemplate.queryForObject(
				"SELECT status FROM subscriptions WHERE tenant_id = 'tenant_green'", String.class);
		try {
			// A lapsed active subscription (past expiry + grace) is expired by the lifecycle job.
			jdbcTemplate.update(
					"UPDATE subscriptions SET status = 'active', last_reminder_on = NULL, expiry = ? WHERE tenant_id = 'tenant_green'",
					java.sql.Date.valueOf(java.time.LocalDate.now().minusDays(30)));
			org.junit.jupiter.api.Assertions.assertTrue(subscriptionLifecycleService.expireLapsed() >= 1);
			org.junit.jupiter.api.Assertions.assertEquals("expired",
					jdbcTemplate.queryForObject("SELECT status FROM subscriptions WHERE tenant_id = 'tenant_green'", String.class));

			// A subscription expiring soon triggers exactly one renewal reminder per day (deduplicated).
			jdbcTemplate.update(
					"UPDATE subscriptions SET status = 'active', last_reminder_on = NULL, expiry = ? WHERE tenant_id = 'tenant_green'",
					java.sql.Date.valueOf(java.time.LocalDate.now().plusDays(5)));
			org.junit.jupiter.api.Assertions.assertTrue(subscriptionLifecycleService.sendExpiryReminders() >= 1);
			org.junit.jupiter.api.Assertions.assertNotNull(
					jdbcTemplate.queryForObject("SELECT last_reminder_on FROM subscriptions WHERE tenant_id = 'tenant_green'", java.sql.Date.class));
			org.junit.jupiter.api.Assertions.assertEquals(0, subscriptionLifecycleService.sendExpiryReminders());

			// Dunning: a subscription lapsed but still within grace triggers an escalated overdue reminder.
			jdbcTemplate.update("UPDATE subscriptions SET status = 'active', last_reminder_on = NULL, expiry = ? WHERE tenant_id = 'tenant_green'",
					java.sql.Date.valueOf(java.time.LocalDate.now().minusDays(3)));
			org.junit.jupiter.api.Assertions.assertTrue(subscriptionLifecycleService.sendExpiryReminders() >= 1);
		} finally {
			jdbcTemplate.update(
					"UPDATE subscriptions SET status = ?, last_reminder_on = NULL, expiry = ? WHERE tenant_id = 'tenant_green'",
					originalStatus, originalExpiry);
		}
	}

	@Test
	void memberHoldsAndSeesAPerFundBalanceForACustomFund() throws Exception {
		String adminToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String treasurerToken = loginAndReturnToken("treasurer@greenvalley.local", "Treasurer@12345");
		String createdFundId = null;
		String txnId = null;
		try {
			// 1) Admin configures a custom Burial fund.
			var fund = mockMvc.perform(post("/api/v1/fund-types")
							.header("Authorization", "Bearer " + adminToken)
							.contentType("application/json")
							.content("{\"code\":\"burial\",\"name\":\"Burial Fund\",\"basis\":\"welfare\"}"))
					.andExpect(status().isCreated())
					.andReturn();
			createdFundId = objectMapper.readTree(fund.getResponse().getContentAsString()).path("data").path("id").asText();

			// 2) A burial cash contribution is captured and posted immediately.
			var created = mockMvc.perform(post("/api/v1/financial-transactions")
							.header("Authorization", "Bearer " + adminToken)
							.contentType("application/json")
							.content("""
									{
									  "branchId": "branch_green_main",
									  "memberId": "member_green_amina",
									  "type": "burial_contribution",
									  "channel": "cash",
									  "amount": 40000,
									  "narration": "Burial fund contribution"
									}
									"""))
					.andExpect(status().isCreated())
					.andExpect(jsonPath("$.data.type", is("burial_contribution")))
					.andExpect(jsonPath("$.data.status", is("posted")))
					.andReturn();
			txnId = objectMapper.readTree(created.getResponse().getContentAsString()).path("data").path("id").asText();

			// 3) The per-fund ledger now holds the member's burial balance.
			java.math.BigDecimal burial = jdbcTemplate.queryForObject(
					"SELECT balance FROM member_fund_balances WHERE member_id = 'member_green_amina' AND fund_code = 'burial'",
					java.math.BigDecimal.class);
			org.hamcrest.MatcherAssert.assertThat(burial.compareTo(new java.math.BigDecimal("40000")), is(0));

			// 4) The member sees all their fund balances (backfilled savings + the new burial fund).
			String memberToken = memberLoginAndReturnToken("GVS-0001", "Member@12345");
			mockMvc.perform(get("/api/v1/member-auth/fund-balances").header("Authorization", "Bearer " + memberToken))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.data[*].fundCode", hasItem("savings")))
					.andExpect(jsonPath("$.data[?(@.fundCode=='burial')].balance", hasItem(org.hamcrest.Matchers.closeTo(40000.0, 0.001))));
		} finally {
			jdbcTemplate.update("DELETE FROM member_fund_balances WHERE fund_code = 'burial'");
			if (txnId != null) jdbcTemplate.update("DELETE FROM financial_transactions WHERE id = ?", txnId);
			if (createdFundId != null) jdbcTemplate.update("DELETE FROM sacco_fund_types WHERE id = ?", createdFundId);
		}
	}

	@Test
	void staffCanConfirmAndClearStatementLineCollectionAccountWithTenantIsolation() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String accountId = "paymentaccount_confirm_bank";
		String otherTenantAccountId = "paymentaccount_confirm_other";
		String statementLineId = "statement_confirm_test";
		String externalReference = "CONFIRM-0001";
		try {
			jdbcTemplate.update("""
					INSERT INTO sacco_payment_accounts
					    (id, tenant_id, channel, network, account_name, account_number, bank_name, active)
					VALUES (?, 'tenant_green', 'bank', NULL, 'Green Valley SACCO', '01234567890', 'Stanbic', TRUE)
					""", accountId);
			jdbcTemplate.update("""
					INSERT INTO sacco_payment_accounts
					    (id, tenant_id, channel, network, account_name, account_number, bank_name, active)
					VALUES (?, 'tenant_lake', 'bank', NULL, 'Lake SACCO', '99999999999', 'Centenary', TRUE)
					""", otherTenantAccountId);
			jdbcTemplate.update("""
					INSERT INTO statement_lines
					    (id, tenant_id, account_code, channel, amount, external_reference, description, statement_date, imported_by_user_id)
					VALUES (?, 'tenant_green', '1010', 'bank', 500000, ?, 'Bulk deposit', DATE '2026-07-14', 'user_green_admin')
					""", statementLineId, externalReference);

			// Confirm attribution.
			mockMvc.perform(patch("/api/v1/statement-lines/" + statementLineId + "/collection-account")
							.header("Authorization", "Bearer " + token)
							.contentType("application/json")
							.content("{\"collectionAccountId\":\"" + accountId + "\"}"))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.data.collectionAccountId", is(accountId)))
					.andExpect(jsonPath("$.data.collectionAccount", is("Stanbic 01234567890")));

			// Cross-tenant account is rejected (tenant isolation).
			mockMvc.perform(patch("/api/v1/statement-lines/" + statementLineId + "/collection-account")
							.header("Authorization", "Bearer " + token)
							.contentType("application/json")
							.content("{\"collectionAccountId\":\"" + otherTenantAccountId + "\"}"))
					.andExpect(status().isNotFound())
					.andExpect(jsonPath("$.error.code", is("PAYMENT_ACCOUNT_NOT_FOUND")));

			// Clear attribution.
			mockMvc.perform(patch("/api/v1/statement-lines/" + statementLineId + "/collection-account")
							.header("Authorization", "Bearer " + token)
							.contentType("application/json")
							.content("{\"collectionAccountId\":null}"))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.data.collectionAccountId", org.hamcrest.Matchers.nullValue()));
		} finally {
			jdbcTemplate.update("DELETE FROM statement_lines WHERE id = ?", statementLineId);
			jdbcTemplate.update("DELETE FROM sacco_payment_accounts WHERE id IN (?, ?)", accountId, otherTenantAccountId);
		}
	}

	@Test
	void staffCanConfirmMobileMoneyCallbackCollectionAccount() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String accountId = "paymentaccount_confirm_callback";
		String callbackId = "callback_confirm_test";
		String externalReference = "CB-CONFIRM-0001";
		try {
			jdbcTemplate.update("""
					INSERT INTO sacco_payment_accounts
					    (id, tenant_id, channel, network, account_name, account_number, active)
					VALUES (?, 'tenant_green', 'mobile_money', 'airtel', 'Green Valley SACCO', '0700940858', TRUE)
					""", accountId);
			jdbcTemplate.update("""
					INSERT INTO mobile_money_callbacks
					    (id, tenant_id, member_id, purpose, amount, external_reference, provider, status, received_at)
					VALUES (?, 'tenant_green', 'member_green_amina', 'savings_deposit', 75000, ?, 'airtel_money', 'posted', CURRENT_TIMESTAMP)
					""", callbackId, externalReference);

			mockMvc.perform(patch("/api/v1/integrations/mobile-money/callbacks/" + callbackId + "/collection-account")
							.header("Authorization", "Bearer " + token)
							.contentType("application/json")
							.content("{\"collectionAccountId\":\"" + accountId + "\"}"))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.data.collectionAccountId", is(accountId)))
					.andExpect(jsonPath("$.data.collectionAccount", is("AIRTEL 0700940858")));

			mockMvc.perform(patch("/api/v1/integrations/mobile-money/callbacks/" + callbackId + "/collection-account")
							.header("Authorization", "Bearer " + token)
							.contentType("application/json")
							.content("{\"collectionAccountId\":null}"))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.data.collectionAccountId", org.hamcrest.Matchers.nullValue()));
		} finally {
			jdbcTemplate.update("DELETE FROM mobile_money_callbacks WHERE id = ?", callbackId);
			jdbcTemplate.update("DELETE FROM sacco_payment_accounts WHERE id = ?", accountId);
		}
	}

	@Test
	void staffCanImportStatementLineAndControlsAreEnforced() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String statementDate = LocalDate.now().toString();
		String externalReference = "BANK-TEST-" + System.currentTimeMillis();

		mockMvc.perform(post("/api/v1/statement-lines")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "channel": "bank",
								  "amount": 125000,
								  "externalReference": "%s",
								  "description": "Manual bank import",
								  "statementDate": "%s"
								}
								""".formatted(externalReference, statementDate)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.accountCode", is("1010")))
				.andExpect(jsonPath("$.data.externalReference", is(externalReference)))
				.andExpect(jsonPath("$.data.importedByUserId", is("user_green_admin")));

		mockMvc.perform(post("/api/v1/statement-lines")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "channel": "bank",
								  "amount": 125000,
								  "externalReference": "%s",
								  "statementDate": "%s"
								}
								""".formatted(externalReference, statementDate)))
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
	void staffCanBatchImportBankStatementLinesWithRowLevelControls() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String statementDate = LocalDate.now().toString();
		String referenceOne = "BANK-BATCH-" + System.currentTimeMillis() + "-001";
		String referenceTwo = "BANK-BATCH-" + System.currentTimeMillis() + "-002";

		mockMvc.perform(post("/api/v1/statement-lines/batch")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "lines": [
								    {
								      "channel": "bank",
								      "amount": 75000,
								      "externalReference": "%s",
								      "description": "Bank collection deposit",
								      "statementDate": "%s"
								    },
								    {
								      "channel": "bank",
								      "amount": -5000,
								      "externalReference": "%s",
								      "description": "Bank charge",
								      "statementDate": "%s"
								    }
								  ]
								}
								""".formatted(referenceOne, statementDate, referenceTwo, statementDate)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.imported.length()", is(2)))
				.andExpect(jsonPath("$.data.imported[*].accountCode", everyItem(is("1010"))))
				.andExpect(jsonPath("$.data.imported[*].importedByUserId", everyItem(is("user_green_admin"))))
				.andExpect(jsonPath("$.data.errors.length()", is(0)));

		mockMvc.perform(post("/api/v1/statement-lines/batch")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "lines": [
								    {
								      "channel": "bank",
								      "amount": 75000,
								      "externalReference": "%s",
								      "statementDate": "%s"
								    }
								  ]
								}
								""".formatted(referenceOne, statementDate)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.data.errors[0].code", is("STATEMENT_LINE_EXISTS")));

		mockMvc.perform(post("/api/v1/statement-lines/batch")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "lines": [
								    {
								      "channel": "bank",
								      "amount": 10000,
								      "externalReference": "BANK-DUP-IN-FILE",
								      "statementDate": "%s"
								    },
								    {
								      "channel": "bank",
								      "amount": 10000,
								      "externalReference": "BANK-DUP-IN-FILE",
								      "statementDate": "%s"
								    },
								    {
								      "channel": "bank",
								      "amount": 10000,
								      "externalReference": "BANK-CLOSED-BATCH",
								      "statementDate": "2026-06-15"
								    }
								  ]
								}
								""".formatted(statementDate, statementDate)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("DUPLICATE_REFERENCE_IN_FILE")))
				.andExpect(jsonPath("$.data.errors[*].code", hasItem("ACCOUNTING_PERIOD_CLOSED")));
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
				.andExpect(jsonPath("$.data.reports[0].dataProtectionEvidence.privacyNoticeAcceptedMembers", greaterThanOrEqualTo(0)))
				.andExpect(jsonPath("$.data.reports[0].dataProtectionEvidence.privacyRequests", greaterThanOrEqualTo(0)))
				.andExpect(jsonPath("$.data.reports[0].dataProtectionEvidence.kycDocuments", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data.reports[0].dataProtectionEvidence.kycDocumentsReviewDue", greaterThanOrEqualTo(0)))
				.andExpect(jsonPath("$.data.reports[0].dataProtectionEvidence.evidenceStatus", notNullValue()))
				.andExpect(jsonPath("$.data.consolidated.tenantId", is("consolidated")))
				.andExpect(jsonPath("$.data.consolidated.dataProtectionEvidence.kycDocuments", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data.csv", startsWith("\"tenant\",\"members\"")))
				.andExpect(jsonPath("$.data.csv", containsString("privacy_requests")))
				.andExpect(jsonPath("$.data.csv", containsString("data_protection_status")));

		mockMvc.perform(get("/api/v1/regulatory-report")
						.header("Authorization", "Bearer " + platformToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.reports.length()", greaterThanOrEqualTo(2)))
				.andExpect(jsonPath("$.data.consolidated.memberCount", greaterThanOrEqualTo(3)))
				.andExpect(jsonPath("$.data.consolidated.dataProtectionEvidence.kycDocuments", greaterThanOrEqualTo(1)));
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
	void loanCreditAppraisalIsRecordedAndListed() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		MvcResult createdLoan = mockMvc.perform(post("/api/v1/loans")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_amina",
								  "product": "Emergency Loan",
								  "amount": 200000,
								  "repaymentMonths": 4
								}
								"""))
				.andExpect(status().isCreated())
				.andReturn();
		String loanId = objectMapper.readTree(createdLoan.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(post("/api/v1/loans/" + loanId + "/appraisals")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{
								  "recommendation": "recommended",
								  "recommendedAmount": 180000,
								  "recommendedTermMonths": 6,
								  "notes": "Affordable; strong repayment history."
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.recommendation", is("recommended")))
				.andExpect(jsonPath("$.data.recommendedAmount", is(180000.00)));

		mockMvc.perform(get("/api/v1/loans/" + loanId + "/appraisals")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", is(1)))
				.andExpect(jsonPath("$.data[0].recommendation", is("recommended")));

		mockMvc.perform(post("/api/v1/loans/" + loanId + "/appraisals")
						.header("Authorization", "Bearer " + token)
						.contentType("application/json")
						.content("""
								{ "recommendation": "maybe" }
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("INVALID_APPRAISAL")));
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

		// Maker initiates disbursement (money does not move yet).
		mockMvc.perform(post("/api/v1/loans/loan_green_0002/disburse")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status", is("approved")))
				.andExpect(jsonPath("$.data.stage", is("Awaiting Disbursement Approval")));

		// The same officer cannot confirm the payout.
		mockMvc.perform(post("/api/v1/loans/loan_green_0002/disburse")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("DISBURSEMENT_CHECKER_REQUIRED")));

		// A second, distinct officer confirms and the loan goes active.
		String checkerToken = loginAndReturnToken("chairperson@greenvalley.local", "Chair@12345");
		mockMvc.perform(post("/api/v1/loans/loan_green_0002/disburse")
						.header("Authorization", "Bearer " + checkerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status", is("active")))
				.andExpect(jsonPath("$.data.stage", is("Disbursed")))
				.andExpect(jsonPath("$.data.balance", is(896000.00)))
				.andExpect(jsonPath("$.data.interestRate", is(2.0000)))
				.andExpect(jsonPath("$.data.interestAmount", is(96000.00)))
				.andExpect(jsonPath("$.data.totalPayable", is(896000.00)))
				.andExpect(jsonPath("$.data.monthlyInstallment", is(149333.33)))
				.andExpect(jsonPath("$.data.disbursedByUserId", is("user_green_chairperson")))
				.andExpect(jsonPath("$.data.disbursedAt", notNullValue()));

		mockMvc.perform(get("/api/v1/loans/loan_green_0002/schedule")
				.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data", hasSize(6)))
				.andExpect(jsonPath("$.data[0].principalDue", is(133333.33)))
				.andExpect(jsonPath("$.data[0].interestDue", is(16000.00)))
				.andExpect(jsonPath("$.data[0].totalDue", is(149333.33)))
				.andExpect(jsonPath("$.data[0].status", is("upcoming")));
	}

	@Test
	void midValueLoanRequiresTwoDistinctApprovers() throws Exception {
		String staffToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

		MvcResult createdLoan = mockMvc.perform(post("/api/v1/loans")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_amina",
								  "product": "Emergency Loan",
								  "amount": 2500000,
								  "repaymentMonths": 6
								}
								"""))
				.andExpect(status().isCreated())
				.andReturn();
		String loanId = objectMapper.readTree(createdLoan.getResponse().getContentAsString()).path("data").path("id").asString();

		// Guarantor pledge is large enough that applicant savings (900,000) + pledge covers the 2.5M loan.
		MvcResult guarantor = mockMvc.perform(post("/api/v1/loans/" + loanId + "/guarantors")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{ "memberId": "member_green_daniel", "guaranteedAmount": 1700000 }
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

		// First approval records but does not finalise.
		mockMvc.perform(patch("/api/v1/loans/" + loanId + "/status")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{ "status": "approved" }
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status", is("under_review")))
				.andExpect(jsonPath("$.data.stage", is("Awaiting Second Approval")));

		// The same approver cannot complete the approval.
		mockMvc.perform(patch("/api/v1/loans/" + loanId + "/status")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{ "status": "approved" }
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error.code", is("SECOND_APPROVER_REQUIRED")));
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
								  "amount": 1000000,
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
				.andExpect(jsonPath("$.data.amount", is(125000.0)))
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
		org.junit.jupiter.api.Assertions.assertEquals(91000.0, openLoan.path("balance").asDouble(), 0.01);
		org.junit.jupiter.api.Assertions.assertEquals(1, openLoan.path("repayments").asInt());
		org.junit.jupiter.api.Assertions.assertEquals(125000.0, openLoan.path("repaymentTotal").asDouble(), 0.01);
		org.junit.jupiter.api.Assertions.assertEquals(4, openLoan.path("scheduledInstallments").asInt());
		org.junit.jupiter.api.Assertions.assertEquals(2, openLoan.path("paidInstallments").asInt());
		org.junit.jupiter.api.Assertions.assertEquals("on_track", openLoan.path("scheduleStatus").asString());
		org.junit.jupiter.api.Assertions.assertFalse(openLoan.path("nextDueDate").asText().isBlank());

		String finalPaymentAmount = openLoan.path("balance").decimalValue().toPlainString();
		mockMvc.perform(post("/api/v1/loans/" + loanId + "/repayments")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{
								  "amount": %s,
								  "channel": "mobile_money",
								  "reference": "LR-TEST-002"
								}
				""".formatted(finalPaymentAmount)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.amount", is(91000.0)));

		MvcResult loans = mockMvc.perform(get("/api/v1/loans")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andReturn();

		JsonNode closedLoan = loanFromList(loans, loanId);
		org.junit.jupiter.api.Assertions.assertEquals("closed", closedLoan.path("status").asString());
		org.junit.jupiter.api.Assertions.assertEquals("Closed", closedLoan.path("stage").asString());
		org.junit.jupiter.api.Assertions.assertEquals(0.0, closedLoan.path("balance").asDouble(), 0.01);
		org.junit.jupiter.api.Assertions.assertEquals(2, closedLoan.path("repayments").asInt());
		org.junit.jupiter.api.Assertions.assertEquals(216000.0, closedLoan.path("repaymentTotal").asDouble(), 0.01);
		org.junit.jupiter.api.Assertions.assertEquals("settled", closedLoan.path("scheduleStatus").asString());

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
		org.junit.jupiter.api.Assertions.assertEquals(91000.0, secondRepaymentJournal.path("debitTotal").asDouble(), 0.01);
	}

	@Test
	void loansExposeArrearsAgingBucketsForCreditControl() throws Exception {
		String staffToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String loanId = createApprovedAndDisbursedLoan(staffToken, 120000);
		LocalDate today = LocalDate.now(java.time.ZoneOffset.UTC);

		jdbcTemplate.update("update loan_repayment_schedules set due_date = ? where loan_id = ? and installment_no = 1", today.minusDays(20), loanId);
		jdbcTemplate.update("update loan_repayment_schedules set due_date = ? where loan_id = ? and installment_no = 2", today.minusDays(45), loanId);
		jdbcTemplate.update("update loan_repayment_schedules set due_date = ? where loan_id = ? and installment_no = 3", today.minusDays(100), loanId);
		jdbcTemplate.update("update loan_repayment_schedules set due_date = ? where loan_id = ? and installment_no = 4", today, loanId);

		MvcResult loans = mockMvc.perform(get("/api/v1/loans")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andReturn();
		JsonNode loan = loanFromList(loans, loanId);
		org.junit.jupiter.api.Assertions.assertEquals("arrears", loan.path("scheduleStatus").asString());
		org.junit.jupiter.api.Assertions.assertEquals(3, loan.path("arrearsInstallments").asInt());
		org.junit.jupiter.api.Assertions.assertTrue(loan.path("arrears1To30Amount").asDouble() > 0);
		org.junit.jupiter.api.Assertions.assertTrue(loan.path("arrears31To60Amount").asDouble() > 0);
		org.junit.jupiter.api.Assertions.assertTrue(loan.path("arrearsOver90Amount").asDouble() > 0);
		org.junit.jupiter.api.Assertions.assertTrue(loan.path("currentDueAmount").asDouble() > 0);
		org.junit.jupiter.api.Assertions.assertTrue(loan.path("oldestArrearsDays").asInt() >= 100);

		MvcResult schedule = mockMvc.perform(get("/api/v1/loans/" + loanId + "/schedule")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].agingBucket", is("1_30")))
				.andExpect(jsonPath("$.data[1].agingBucket", is("31_60")))
				.andExpect(jsonPath("$.data[2].agingBucket", is("over_90")))
				.andExpect(jsonPath("$.data[3].agingBucket", is("current")))
				.andReturn();
		JsonNode scheduleRows = objectMapper.readTree(schedule.getResponse().getContentAsString()).path("data");
		org.junit.jupiter.api.Assertions.assertTrue(scheduleRows.path(2).path("daysPastDue").asInt() >= 100);
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

		mockMvc.perform(get("/api/v1/loans/" + loanId + "/cover")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.covered", is(true)))
				.andExpect(jsonPath("$.data.applicant.membershipNo", is("GVS-0001")))
				.andExpect(jsonPath("$.data.guarantors.length()", is(1)))
				.andExpect(jsonPath("$.data.guarantors[0].membershipNo", is("GVS-0002")))
				.andExpect(jsonPath("$.data.guarantors[0].status", is("accepted")));

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
	void memberGuarantorSearchReturnsIdentityOnlyAndRespectsOptOut() throws Exception {
		String aminaToken = memberLoginAndReturnToken("GVS-0001", "Member@12345");

		// Finds another active member by name; returns identity only (no balances).
		mockMvc.perform(get("/api/v1/member-auth/members/search?q=Daniel")
						.header("Authorization", "Bearer " + aminaToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].membershipNo", is("GVS-0002")))
				.andExpect(jsonPath("$.data[0].fullName", is("Daniel Ssekajja")))
				.andExpect(jsonPath("$.data[0].savingsBalance").doesNotExist())
				.andExpect(jsonPath("$.data[0].savings").doesNotExist());

		// Too-short queries return nothing.
		mockMvc.perform(get("/api/v1/member-auth/members/search?q=D")
						.header("Authorization", "Bearer " + aminaToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", is(0)));

		// The searcher never sees themselves.
		mockMvc.perform(get("/api/v1/member-auth/members/search?q=Amina")
						.header("Authorization", "Bearer " + aminaToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", is(0)));

		// A member who opts out disappears from the picker.
		String danielToken = memberLoginAndReturnToken("GVS-0002", "Member@12345");
		mockMvc.perform(patch("/api/v1/member-auth/guarantor-listing")
						.header("Authorization", "Bearer " + danielToken)
						.contentType("application/json")
						.content("""
								{ "optOut": true }
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.optOut", is(true)));

		mockMvc.perform(get("/api/v1/member-auth/members/search?q=Daniel")
						.header("Authorization", "Bearer " + aminaToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", is(0)));
	}

	@Test
	void savingsSecuredLoanNeedsNoGuarantor() throws Exception {
		// Amina's savings (900,000) fully cover a small loan plus interest, so no guarantor is required.
		String memberToken = memberLoginAndReturnToken("GVS-0001", "Member@12345");
		MvcResult created = mockMvc.perform(post("/api/v1/member-auth/mobile-loans")
						.header("Authorization", "Bearer " + memberToken)
						.contentType("application/json")
						.content("""
								{
								  "product": "Emergency Loan",
								  "amount": 100000,
								  "repaymentMonths": 12,
								  "purpose": "Savings-secured advance"
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.status", is("submitted")))
				.andReturn();
		String loanId = objectMapper.readTree(created.getResponse().getContentAsString()).path("data").path("id").asString();

		// Staff can approve it straight away without any guarantor.
		String staffToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		mockMvc.perform(patch("/api/v1/loans/" + loanId + "/status")
						.header("Authorization", "Bearer " + staffToken)
						.contentType("application/json")
						.content("""
								{ "status": "approved" }
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status", is("approved")))
				.andExpect(jsonPath("$.data.guarantors", is(0)));
	}

	@Test
	void savingsSecuredLoanHoldsAndReleasesSavings() throws Exception {
		try {
			String memberToken = memberLoginAndReturnToken("GVS-0001", "Member@12345");
			MvcResult created = mockMvc.perform(post("/api/v1/member-auth/mobile-loans")
							.header("Authorization", "Bearer " + memberToken)
							.contentType("application/json")
							.content("""
									{ "product": "Emergency Loan", "amount": 100000, "repaymentMonths": 12, "purpose": "Secured" }
									"""))
					.andExpect(status().isCreated())
					.andReturn();
			String loanId = objectMapper.readTree(created.getResponse().getContentAsString()).path("data").path("id").asString();

			String staffToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
			mockMvc.perform(patch("/api/v1/loans/" + loanId + "/status")
							.header("Authorization", "Bearer " + staffToken)
							.contentType("application/json").content("{ \"status\": \"approved\" }"))
					.andExpect(status().isOk());

			// Two officers disburse; total payable = 124,000 (100,000 + 2% x 12 months).
			mockMvc.perform(post("/api/v1/loans/" + loanId + "/disburse").header("Authorization", "Bearer " + staffToken))
					.andExpect(status().isOk());
			String checkerToken = loginAndReturnToken("chairperson@greenvalley.local", "Chair@12345");
			mockMvc.perform(post("/api/v1/loans/" + loanId + "/disburse").header("Authorization", "Bearer " + checkerToken))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.data.status", is("active")));

			java.math.BigDecimal hold = jdbcTemplate.queryForObject(
					"SELECT savings_hold FROM members WHERE id = 'member_green_amina'", java.math.BigDecimal.class);
			org.junit.jupiter.api.Assertions.assertEquals(0, hold.compareTo(new java.math.BigDecimal("124000.00")));

			// Repaying the full balance releases the hold.
			mockMvc.perform(post("/api/v1/loans/" + loanId + "/repayments")
							.header("Authorization", "Bearer " + staffToken)
							.contentType("application/json")
							.content("{ \"amount\": 124000, \"channel\": \"cash\", \"reference\": \"LR-SEC-" + System.currentTimeMillis() + "\" }"))
					.andExpect(status().isCreated());

			java.math.BigDecimal after = jdbcTemplate.queryForObject(
					"SELECT savings_hold FROM members WHERE id = 'member_green_amina'", java.math.BigDecimal.class);
			org.junit.jupiter.api.Assertions.assertEquals(0, after.compareTo(java.math.BigDecimal.ZERO));
		} finally {
			jdbcTemplate.update("UPDATE members SET savings_hold = 0 WHERE id = 'member_green_amina'");
		}
	}

	@Test
	void memberCanViewOwnLoanRepaymentHistory() throws Exception {
		String memberToken = memberLoginAndReturnToken("GVS-0001", "Member@12345");
		mockMvc.perform(get("/api/v1/member-auth/loans/loan_green_0001/repayments")
						.header("Authorization", "Bearer " + memberToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()", org.hamcrest.Matchers.greaterThanOrEqualTo(4)))
				.andExpect(jsonPath("$.data[0].reference", notNullValue()))
				.andExpect(jsonPath("$.data[0].amount", notNullValue()));

		// A member cannot read another member's loan repayments.
		String otherToken = memberLoginAndReturnToken("GVS-0002", "Member@12345");
		mockMvc.perform(get("/api/v1/member-auth/loans/loan_green_0001/repayments")
						.header("Authorization", "Bearer " + otherToken))
				.andExpect(status().isNotFound());
	}

	@Test
	void everyMemberBalanceIsFullyBackedByPostedTransactions() throws Exception {
		String adminToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		// A member seeded with a balance but no history is now backed by an opening reconciliation
		// deposit, so the whole displayed balance is explained by posted transactions (opening 0).
		mockMvc.perform(get("/api/v1/members/member_green_grace/statement")
						.header("Authorization", "Bearer " + adminToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.openingBalances.savings", is(0.00)))
				.andExpect(jsonPath("$.data.openingBalances.shares", is(0.00)))
				.andExpect(jsonPath("$.data.openingBalances.welfare", is(0.00)))
				.andExpect(jsonPath("$.data.closingBalances.savings", is(1350000.00)))
				.andExpect(jsonPath("$.data.closingBalances.shares", is(300000.00)))
				.andExpect(jsonPath("$.data.closingBalances.welfare", is(75000.00)));

		// Daniel had partial history; the reconciliation tops up the shortfall so he reconciles too.
		mockMvc.perform(get("/api/v1/members/member_green_daniel/statement")
						.header("Authorization", "Bearer " + adminToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.openingBalances.savings", is(0.00)))
				.andExpect(jsonPath("$.data.openingBalances.shares", is(0.00)))
				.andExpect(jsonPath("$.data.openingBalances.welfare", is(0.00)))
				.andExpect(jsonPath("$.data.closingBalances.savings", is(1210000.00)))
				.andExpect(jsonPath("$.data.closingBalances.shares", is(500000.00)))
				.andExpect(jsonPath("$.data.closingBalances.welfare", is(110000.00)));
	}

	@Test
	void memberLoanWithoutGuarantorOrSavingsIsRejected() throws Exception {
		// Daniel's savings (1,210,000) do not cover a 5,000,000 loan, so a guarantor is required.
		String memberToken = memberLoginAndReturnToken("GVS-0002", "Member@12345");
		mockMvc.perform(post("/api/v1/member-auth/mobile-loans")
						.header("Authorization", "Bearer " + memberToken)
						.contentType("application/json")
						.content("""
								{
								  "product": "Emergency Loan",
								  "amount": 5000000,
								  "repaymentMonths": 12,
								  "purpose": "No guarantor, insufficient savings"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code", is("GUARANTOR_OR_SELF_COVER_REQUIRED")));
	}

	@Test
	void memberCanAddReplacementGuarantorAfterRejection() throws Exception {
		String applicantToken = memberLoginAndReturnToken("GVS-0001", "Member@12345");
		MvcResult loanResult = mockMvc.perform(post("/api/v1/member-auth/mobile-loans")
						.header("Authorization", "Bearer " + applicantToken)
						.contentType("application/json")
						.content("""
								{
								  "product": "Emergency Loan",
								  "amount": 300000,
								  "repaymentMonths": 5,
								  "purpose": "Replacement guarantor flow",
								  "guarantors": [{ "membershipNo": "GVS-0002", "pledgeAmount": 150000 }]
								}
								"""))
				.andExpect(status().isCreated())
				.andReturn();
		String loanId = objectMapper.readTree(loanResult.getResponse().getContentAsString()).path("data").path("id").asString();

		String guarantorToken = memberLoginAndReturnToken("GVS-0002", "Member@12345");
		MvcResult requests = mockMvc.perform(get("/api/v1/member-auth/guarantor-requests")
						.header("Authorization", "Bearer " + guarantorToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].capacity", notNullValue()))
				.andExpect(jsonPath("$.data[0].guaranteeCeiling", notNullValue()))
				.andExpect(jsonPath("$.data[0].committedGuarantees", notNullValue()))
				.andReturn();
		String guarantorId = objectMapper.readTree(requests.getResponse().getContentAsString()).path("data").get(0).path("id").asString();

		mockMvc.perform(patch("/api/v1/member-auth/guarantor-requests/" + guarantorId + "/status")
						.header("Authorization", "Bearer " + guarantorToken)
						.contentType("application/json")
						.content("""
								{ "status": "rejected" }
								"""))
				.andExpect(status().isOk());

		// Applicant adds a replacement guarantor while the loan is still under review.
		mockMvc.perform(post("/api/v1/member-auth/loans/" + loanId + "/guarantors")
						.header("Authorization", "Bearer " + applicantToken)
						.contentType("application/json")
						.content("""
								{ "membershipNo": "GVS-0002", "pledgeAmount": 150000 }
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.memberId", is("member_green_daniel")))
				.andExpect(jsonPath("$.data.status", is("pending")));
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
	void saccoStaffAccessManagementRequiresProtectedAdministratorRole() throws Exception {
		String saccoToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		long suffix = System.currentTimeMillis();
		String roleName = "Overpowered Access Test " + suffix;
		String managerEmail = "overpowered-access-" + suffix + "@greenvalley.local";

		MvcResult createdRole = mockMvc.perform(post("/api/v1/roles")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "name": "%s",
								  "permissionIds": ["users:view", "users:create", "roles:view", "roles:create", "reports:view"]
								}
								""".formatted(roleName)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.protectedRole", is(false)))
				.andReturn();
		String roleId = objectMapper.readTree(createdRole.getResponse().getContentAsString()).path("data").path("id").asString();

		MvcResult createdUser = mockMvc.perform(post("/api/v1/users")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "fullName": "Overpowered Access Staff",
								  "email": "%s",
								  "phone": "+256700778899",
								  "password": "Plain@12345"
								}
								""".formatted(managerEmail)))
				.andExpect(status().isCreated())
				.andReturn();
		String userId = objectMapper.readTree(createdUser.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(put("/api/v1/users/" + userId + "/roles")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "roleIds": ["%s"]
								}
								""".formatted(roleId)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.roleIds[0]", is(roleId)));

		String overpoweredToken = loginAndReturnToken(managerEmail, "Plain@12345");

		mockMvc.perform(post("/api/v1/users")
						.header("Authorization", "Bearer " + overpoweredToken)
						.contentType("application/json")
						.content("""
								{
								  "fullName": "Denied Staff Manager",
								  "email": "denied-staff-manager-%s@greenvalley.local",
								  "password": "Plain@12345"
								}
								""".formatted(suffix)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("SACCO_ADMIN_REQUIRED")));

		mockMvc.perform(post("/api/v1/roles")
						.header("Authorization", "Bearer " + overpoweredToken)
						.contentType("application/json")
						.content("""
								{
								  "name": "Denied Role Manager %s",
								  "permissionIds": ["users:view"]
								}
								""".formatted(suffix)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("SACCO_ADMIN_REQUIRED")));

		mockMvc.perform(put("/api/v1/users/user_green_treasurer/roles")
						.header("Authorization", "Bearer " + overpoweredToken)
						.contentType("application/json")
						.content("""
								{
								  "roleIds": ["role_green_treasurer"]
								}
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("SACCO_ADMIN_REQUIRED")));

		mockMvc.perform(patch("/api/v1/users/user_green_treasurer/status")
						.header("Authorization", "Bearer " + overpoweredToken)
						.contentType("application/json")
						.content("""
								{ "status": "suspended" }
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("SACCO_ADMIN_REQUIRED")));

		mockMvc.perform(post("/api/v1/users/user_green_treasurer/password-reset")
						.header("Authorization", "Bearer " + overpoweredToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("SACCO_ADMIN_REQUIRED")));
	}

	@Test
	void branchManagersAreScopedToAssignedBranchesForMembersAndTransactions() throws Exception {
		String saccoToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		long suffix = System.currentTimeMillis();
		String managerEmail = "branch-manager-" + suffix + "@greenvalley.local";
		String roleName = "Branch Manager Scope " + suffix;

		MvcResult createdUser = mockMvc.perform(post("/api/v1/users")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "fullName": "Branch Manager Scope",
								  "email": "%s",
								  "phone": "+25670055%s",
								  "password": "Plain@12345"
								}
								""".formatted(managerEmail, String.valueOf(suffix).substring(String.valueOf(suffix).length() - 4))))
				.andExpect(status().isCreated())
				.andReturn();
		String managerUserId = objectMapper.readTree(createdUser.getResponse().getContentAsString()).path("data").path("id").asString();

		MvcResult createdRole = mockMvc.perform(post("/api/v1/roles")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "name": "%s",
								  "permissionIds": ["members:view", "members:create", "transactions:view", "transactions:create"]
								}
								""".formatted(roleName)))
				.andExpect(status().isCreated())
				.andReturn();
		String roleId = objectMapper.readTree(createdRole.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(put("/api/v1/users/" + managerUserId + "/roles")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "roleIds": ["%s"]
								}
								""".formatted(roleId)))
				.andExpect(status().isOk());

		MvcResult createdBranch = mockMvc.perform(post("/api/v1/branches")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_green",
								  "code": "BM%s",
								  "name": "Branch Manager Test",
								  "address": "Branch Scope Road",
								  "managerUserId": "%s"
								}
								""".formatted(String.valueOf(suffix).substring(String.valueOf(suffix).length() - 5), managerUserId)))
				.andExpect(status().isCreated())
				.andReturn();
		String managedBranchId = objectMapper.readTree(createdBranch.getResponse().getContentAsString()).path("data").path("id").asString();
		String branchManagerToken = loginAndReturnToken(managerEmail, "Plain@12345");
		String membershipNo = "GVS-BM-" + suffix;

		MvcResult createdMember = mockMvc.perform(post("/api/v1/members")
						.header("Authorization", "Bearer " + branchManagerToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_green",
								  "branchId": "%s",
								  "membershipNo": "%s",
								  "fullName": "Branch Scoped Member",
								  "phone": "+25670155%s",
								  "password": "Member@12345"
								}
								""".formatted(managedBranchId, membershipNo, String.valueOf(suffix).substring(String.valueOf(suffix).length() - 4))))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.branchId", is(managedBranchId)))
				.andReturn();
		String managedMemberId = objectMapper.readTree(createdMember.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(get("/api/v1/members")
						.header("Authorization", "Bearer " + branchManagerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].membershipNo", hasItem(membershipNo)))
				.andExpect(jsonPath("$.data[*].membershipNo", not(hasItem("GVS-0002"))));

		mockMvc.perform(get("/api/v1/members/member_green_daniel")
						.header("Authorization", "Bearer " + branchManagerToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("BRANCH_ACCESS_DENIED")));

		mockMvc.perform(post("/api/v1/members")
						.header("Authorization", "Bearer " + branchManagerToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_green",
								  "branchId": "branch_green_seeta",
								  "membershipNo": "GVS-BLOCK-%s",
								  "fullName": "Blocked Branch Member",
								  "phone": "+25670255%s"
								}
								""".formatted(suffix, String.valueOf(suffix).substring(String.valueOf(suffix).length() - 4))))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("BRANCH_ACCESS_DENIED")));

		MvcResult createdTransaction = mockMvc.perform(post("/api/v1/financial-transactions")
						.header("Authorization", "Bearer " + branchManagerToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_green",
								  "branchId": "%s",
								  "memberId": "%s",
								  "type": "savings_deposit",
								  "channel": "cash",
								  "amount": 15000,
								  "narration": "Branch manager deposit"
								}
								""".formatted(managedBranchId, managedMemberId)))
				.andExpect(status().isCreated())
				.andReturn();
		String reference = objectMapper.readTree(createdTransaction.getResponse().getContentAsString()).path("data").path("reference").asString();

		mockMvc.perform(get("/api/v1/financial-transactions")
						.header("Authorization", "Bearer " + branchManagerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].reference", hasItem(reference)))
				.andExpect(jsonPath("$.data[*].reference", not(hasItem("GVS-TX-0002"))));

		mockMvc.perform(post("/api/v1/financial-transactions")
						.header("Authorization", "Bearer " + branchManagerToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_green",
								  "branchId": "branch_green_seeta",
								  "memberId": "member_green_daniel",
								  "type": "savings_deposit",
								  "channel": "cash",
								  "amount": 15000,
								  "narration": "Blocked branch deposit"
								}
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("BRANCH_ACCESS_DENIED")));
	}

	@Test
	void branchManagersAreScopedToAssignedBranchesForLoansAndRepayments() throws Exception {
		String saccoToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		long suffix = System.currentTimeMillis();
		String suffix4 = String.valueOf(suffix).substring(String.valueOf(suffix).length() - 4);
		String suffix5 = String.valueOf(suffix).substring(String.valueOf(suffix).length() - 5);
		String managerEmail = "branch-loans-" + suffix + "@greenvalley.local";
		String roleName = "Branch Loan Scope " + suffix;

		MvcResult createdUser = mockMvc.perform(post("/api/v1/users")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "fullName": "Branch Loan Manager",
								  "email": "%s",
								  "phone": "+25670355%s",
								  "password": "Plain@12345"
								}
								""".formatted(managerEmail, suffix4)))
				.andExpect(status().isCreated())
				.andReturn();
		String managerUserId = objectMapper.readTree(createdUser.getResponse().getContentAsString()).path("data").path("id").asString();

		MvcResult createdRole = mockMvc.perform(post("/api/v1/roles")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "name": "%s",
								  "permissionIds": ["members:view", "loans:view", "loans:create", "loans:approve", "transactions:approve"]
								}
								""".formatted(roleName)))
				.andExpect(status().isCreated())
				.andReturn();
		String roleId = objectMapper.readTree(createdRole.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(put("/api/v1/users/" + managerUserId + "/roles")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{ "roleIds": ["%s"] }
								""".formatted(roleId)))
				.andExpect(status().isOk());

		MvcResult createdBranch = mockMvc.perform(post("/api/v1/branches")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_green",
								  "code": "BL%s",
								  "name": "Branch Loan Scope",
								  "address": "Loan Scope Road",
								  "managerUserId": "%s"
								}
								""".formatted(suffix5, managerUserId)))
				.andExpect(status().isCreated())
				.andReturn();
		String managedBranchId = objectMapper.readTree(createdBranch.getResponse().getContentAsString()).path("data").path("id").asString();

		MvcResult borrower = mockMvc.perform(post("/api/v1/members")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_green",
								  "branchId": "%s",
								  "membershipNo": "GVS-LB-%s",
								  "fullName": "Branch Loan Borrower",
								  "phone": "+25670455%s",
								  "password": "Member@12345"
								}
								""".formatted(managedBranchId, suffix, suffix4)))
				.andExpect(status().isCreated())
				.andReturn();
		String borrowerId = objectMapper.readTree(borrower.getResponse().getContentAsString()).path("data").path("id").asString();

		MvcResult guarantor = mockMvc.perform(post("/api/v1/members")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_green",
								  "branchId": "%s",
								  "membershipNo": "GVS-LG-%s",
								  "fullName": "Branch Loan Guarantor",
								  "phone": "+25670555%s",
								  "password": "Member@12345"
								}
								""".formatted(managedBranchId, suffix, suffix4)))
				.andExpect(status().isCreated())
				.andReturn();
		String guarantorId = objectMapper.readTree(guarantor.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(patch("/api/v1/members/" + borrowerId + "/status")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("{ \"status\": \"active\" }"))
				.andExpect(status().isOk());
		mockMvc.perform(patch("/api/v1/members/" + guarantorId + "/status")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("{ \"status\": \"active\" }"))
				.andExpect(status().isOk());
		jdbcTemplate.update("update members set savings_balance = 250000 where id in (?, ?)", borrowerId, guarantorId);

		String branchManagerToken = loginAndReturnToken(managerEmail, "Plain@12345");

		MvcResult createdLoan = mockMvc.perform(post("/api/v1/loans")
						.header("Authorization", "Bearer " + branchManagerToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_green",
								  "memberId": "%s",
								  "product": "Development Loan",
								  "amount": 120000,
								  "repaymentMonths": 6,
								  "purpose": "Branch-scoped loan"
								}
								""".formatted(borrowerId)))
				.andExpect(status().isCreated())
				.andReturn();
		String loanId = objectMapper.readTree(createdLoan.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(get("/api/v1/loans")
						.header("Authorization", "Bearer " + branchManagerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].id", hasItem(loanId)))
				.andExpect(jsonPath("$.data[*].id", not(hasItem("loan_green_0002"))));

		mockMvc.perform(get("/api/v1/loans/loan_green_0002/schedule")
						.header("Authorization", "Bearer " + branchManagerToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("BRANCH_ACCESS_DENIED")));

		mockMvc.perform(post("/api/v1/loans/" + loanId + "/guarantors")
						.header("Authorization", "Bearer " + branchManagerToken)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "%s",
								  "guaranteedAmount": 60000
								}
								""".formatted(guarantorId)))
				.andExpect(status().isCreated());

		mockMvc.perform(post("/api/v1/loans/" + loanId + "/guarantors")
						.header("Authorization", "Bearer " + branchManagerToken)
						.contentType("application/json")
						.content("""
								{
								  "memberId": "member_green_amina",
								  "guaranteedAmount": 60000
								}
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("BRANCH_ACCESS_DENIED")));

		mockMvc.perform(post("/api/v1/loans/loan_green_0001/repayments")
						.header("Authorization", "Bearer " + branchManagerToken)
						.contentType("application/json")
						.content("""
								{
								  "amount": 10000,
								  "channel": "cash",
								  "reference": "BRANCH-DENIED-%s"
								}
								""".formatted(suffix)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("BRANCH_ACCESS_DENIED")));
	}

	@Test
	void branchManagersAreScopedForAccountingJournalsAndBlockedFromSaccoWideReconciliation() throws Exception {
		String saccoToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		long suffix = System.currentTimeMillis();
		String suffix4 = String.valueOf(suffix).substring(String.valueOf(suffix).length() - 4);
		String suffix5 = String.valueOf(suffix).substring(String.valueOf(suffix).length() - 5);
		String managerEmail = "branch-accounting-" + suffix + "@greenvalley.local";
		String roleName = "Branch Accounting Scope " + suffix;

		MvcResult createdUser = mockMvc.perform(post("/api/v1/users")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "fullName": "Branch Accounting Manager",
								  "email": "%s",
								  "phone": "+25670655%s",
								  "password": "Plain@12345"
								}
								""".formatted(managerEmail, suffix4)))
				.andExpect(status().isCreated())
				.andReturn();
		String managerUserId = objectMapper.readTree(createdUser.getResponse().getContentAsString()).path("data").path("id").asString();

		MvcResult createdRole = mockMvc.perform(post("/api/v1/roles")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "name": "%s",
								  "permissionIds": ["members:view", "transactions:create", "accounting:view", "reports:view", "complaints:view", "complaints:manage", "governance:view", "governance:manage"]
								}
								""".formatted(roleName)))
				.andExpect(status().isCreated())
				.andReturn();
		String roleId = objectMapper.readTree(createdRole.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(put("/api/v1/users/" + managerUserId + "/roles")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{ "roleIds": ["%s"] }
								""".formatted(roleId)))
				.andExpect(status().isOk());

		MvcResult createdBranch = mockMvc.perform(post("/api/v1/branches")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_green",
								  "code": "BA%s",
								  "name": "Branch Accounting Scope",
								  "address": "Accounting Scope Road",
								  "managerUserId": "%s"
								}
								""".formatted(suffix5, managerUserId)))
				.andExpect(status().isCreated())
				.andReturn();
		String managedBranchId = objectMapper.readTree(createdBranch.getResponse().getContentAsString()).path("data").path("id").asString();

		MvcResult member = mockMvc.perform(post("/api/v1/members")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_green",
								  "branchId": "%s",
								  "membershipNo": "GVS-BA-%s",
								  "fullName": "Branch Accounting Member",
								  "phone": "+25670755%s",
								  "password": "Member@12345"
								}
								""".formatted(managedBranchId, suffix, suffix4)))
				.andExpect(status().isCreated())
				.andReturn();
		String memberId = objectMapper.readTree(member.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(patch("/api/v1/members/" + memberId + "/status")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("{ \"status\": \"active\" }"))
				.andExpect(status().isOk());

		String branchManagerToken = loginAndReturnToken(managerEmail, "Plain@12345");
		MvcResult createdTransaction = mockMvc.perform(post("/api/v1/financial-transactions")
						.header("Authorization", "Bearer " + branchManagerToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_green",
								  "branchId": "%s",
								  "memberId": "%s",
								  "type": "savings_deposit",
								  "channel": "cash",
								  "amount": 20000,
								  "narration": "Branch-scoped accounting deposit"
								}
								""".formatted(managedBranchId, memberId)))
				.andExpect(status().isCreated())
				.andReturn();
		String transactionId = objectMapper.readTree(createdTransaction.getResponse().getContentAsString()).path("data").path("id").asString();
		String reference = objectMapper.readTree(createdTransaction.getResponse().getContentAsString()).path("data").path("reference").asString();

		mockMvc.perform(get("/api/v1/journal-entries")
						.header("Authorization", "Bearer " + branchManagerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].reference", hasItem(reference)))
				.andExpect(jsonPath("$.data[*].reference", not(hasItem("GVS-TX-0001"))));

		mockMvc.perform(get("/api/v1/statement-lines")
						.header("Authorization", "Bearer " + branchManagerToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("BRANCH_ACCESS_DENIED")));

		mockMvc.perform(get("/api/v1/reconciliation")
						.header("Authorization", "Bearer " + branchManagerToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("BRANCH_ACCESS_DENIED")));

		mockMvc.perform(get("/api/v1/regulatory-report")
						.header("Authorization", "Bearer " + branchManagerToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("BRANCH_ACCESS_DENIED")));

		mockMvc.perform(get("/api/v1/audit-events")
						.header("Authorization", "Bearer " + branchManagerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].action", hasItem("Posted cash financial transaction " + reference)))
				.andExpect(jsonPath("$.data[*].actorName", not(hasItem("Green Valley Administrator"))));

		mockMvc.perform(get("/api/v1/audit-events?page=0&size=10")
						.header("Authorization", "Bearer " + branchManagerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].action", hasItem("Posted cash financial transaction " + reference)))
				.andExpect(jsonPath("$.data[*].actorName", not(hasItem("Green Valley Administrator"))));

		String ownComplaintSubject = "Branch complaint " + suffix;
		MvcResult ownComplaint = mockMvc.perform(post("/api/v1/complaints")
						.header("Authorization", "Bearer " + branchManagerToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_green",
								  "memberId": "%s",
								  "category": "service",
								  "subject": "%s",
								  "description": "Branch-scoped complaint",
								  "channel": "branch",
								  "priority": "medium"
								}
								""".formatted(memberId, ownComplaintSubject)))
				.andExpect(status().isCreated())
				.andReturn();
		String ownComplaintId = objectMapper.readTree(ownComplaint.getResponse().getContentAsString()).path("data").path("id").asString();

		MvcResult outsideComplaint = mockMvc.perform(post("/api/v1/complaints")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_green",
								  "memberId": "member_green_amina",
								  "category": "service",
								  "subject": "Outside branch complaint %s",
								  "description": "Outside branch complaint",
								  "channel": "branch",
								  "priority": "medium"
								}
								""".formatted(suffix)))
				.andExpect(status().isCreated())
				.andReturn();
		String outsideComplaintId = objectMapper.readTree(outsideComplaint.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(get("/api/v1/complaints")
						.header("Authorization", "Bearer " + branchManagerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].subject", hasItem(ownComplaintSubject)))
				.andExpect(jsonPath("$.data[*].subject", not(hasItem("Outside branch complaint " + suffix))));

		mockMvc.perform(patch("/api/v1/complaints/" + ownComplaintId + "/status")
						.header("Authorization", "Bearer " + branchManagerToken)
						.contentType("application/json")
						.content("""
								{ "status": "in_progress", "resolutionNotes": "Reviewing in branch" }
								"""))
				.andExpect(status().isOk());

		mockMvc.perform(patch("/api/v1/complaints/" + outsideComplaintId + "/status")
						.header("Authorization", "Bearer " + branchManagerToken)
						.contentType("application/json")
						.content("""
								{ "status": "in_progress", "resolutionNotes": "Should be denied" }
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("BRANCH_ACCESS_DENIED")));

		String ownThreadSubject = "Branch chat " + suffix;
		MvcResult ownThread = mockMvc.perform(post("/api/v1/chat/threads")
						.header("Authorization", "Bearer " + branchManagerToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_green",
								  "type": "MEMBER_SUPPORT",
								  "memberId": "%s",
								  "subject": "%s",
								  "message": "Branch-scoped member chat"
								}
								""".formatted(memberId, ownThreadSubject)))
				.andExpect(status().isCreated())
				.andReturn();
		String ownThreadId = objectMapper.readTree(ownThread.getResponse().getContentAsString()).path("data").path("id").asString();

		MvcResult outsideThread = mockMvc.perform(post("/api/v1/chat/threads")
						.header("Authorization", "Bearer " + saccoToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_green",
								  "type": "MEMBER_SUPPORT",
								  "memberId": "member_green_amina",
								  "subject": "Outside branch chat %s",
								  "message": "Outside branch member chat"
								}
								""".formatted(suffix)))
				.andExpect(status().isCreated())
				.andReturn();
		String outsideThreadId = objectMapper.readTree(outsideThread.getResponse().getContentAsString()).path("data").path("id").asString();

		mockMvc.perform(get("/api/v1/chat/threads?type=MEMBER_SUPPORT")
						.header("Authorization", "Bearer " + branchManagerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].subject", hasItem(ownThreadSubject)))
				.andExpect(jsonPath("$.data[*].subject", not(hasItem("Outside branch chat " + suffix))));

		mockMvc.perform(get("/api/v1/chat/threads/" + ownThreadId + "/messages")
						.header("Authorization", "Bearer " + branchManagerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[*].body", hasItem("Branch-scoped member chat")));

		mockMvc.perform(get("/api/v1/chat/threads/" + outsideThreadId + "/messages")
						.header("Authorization", "Bearer " + branchManagerToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("BRANCH_ACCESS_DENIED")));

		mockMvc.perform(get("/api/v1/governance-meetings")
						.header("Authorization", "Bearer " + branchManagerToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("BRANCH_ACCESS_DENIED")));

		mockMvc.perform(post("/api/v1/governance-meetings")
						.header("Authorization", "Bearer " + branchManagerToken)
						.contentType("application/json")
						.content("""
								{
								  "tenantId": "tenant_green",
								  "title": "Branch should not create board record %s",
								  "meetingType": "board"
								}
								""".formatted(suffix)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("BRANCH_ACCESS_DENIED")));

		mockMvc.perform(post("/api/v1/governance-meetings/meeting_green_0001/resolutions")
						.header("Authorization", "Bearer " + branchManagerToken)
						.contentType("application/json")
						.content("""
								{
								  "title": "Branch should not resolve board record %s",
								  "decision": "Denied"
								}
								""".formatted(suffix)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("BRANCH_ACCESS_DENIED")));
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

		mockMvc.perform(post("/api/v1/audit-events")
						.header("Authorization", "Bearer " + noPermissionToken)
						.contentType("application/json")
						.content("""
								{
								  "action": "No-permission staff should not fabricate audit evidence",
								  "resourceType": "audit",
								  "resourceId": "denied"
								}
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code", is("PERMISSION_REQUIRED")))
				.andExpect(jsonPath("$.error.message", containsString("reports:view")));
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
								  "saccoCode": "%s",
								  "username": "%s",
								  "password": "%s"
								}
								""".formatted(loginCodeFor(email), email, password)))
				.andExpect(status().isOk())
				.andReturn();

		JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
		return root.path("data").path("token").asString();
	}

	private String loginCodeFor(String email) {
		String normalized = email.toLowerCase();
		return normalized.contains("@platform.") || normalized.contains("platform-") || normalized.contains("@tereka.local") ? "PLATFORM" : "GVS";
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
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.stage", is("Awaiting Disbursement Approval")));

		String disbursementCheckerToken = loginAndReturnToken("chairperson@greenvalley.local", "Chair@12345");
		mockMvc.perform(post("/api/v1/loans/" + loanId + "/disburse")
						.header("Authorization", "Bearer " + disbursementCheckerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status", is("active")));

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

	private String ensureCurrentAccountingPeriod(String tenantId) {
		String period = LocalDate.now().toString().substring(0, 7);
		String periodId = "period_" + tenantId + "_" + period.replace("-", "_");
		Integer existing = jdbcTemplate.queryForObject(
				"SELECT COUNT(*) FROM accounting_periods WHERE tenant_id = ? AND period = ?",
				Integer.class,
				tenantId,
				period);
		if (existing == null || existing == 0) {
			jdbcTemplate.update(
					"INSERT INTO accounting_periods (id, tenant_id, period, status) VALUES (?, ?, ?, 'open')",
					periodId,
					tenantId,
					period);
		} else {
			jdbcTemplate.update(
					"UPDATE accounting_periods SET status = 'open', closed_by_user_id = NULL, closed_at = NULL WHERE tenant_id = ? AND period = ?",
					tenantId,
					period);
		}
		return periodId;
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
