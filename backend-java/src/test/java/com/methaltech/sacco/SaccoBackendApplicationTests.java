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
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
	void financialTransactionPostingUsesMakerCheckerAndUpdatesBalances() throws Exception {
		String makerToken = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");
		String checkerEmail = "checker-" + System.currentTimeMillis() + "@greenvalley.local";

		mockMvc.perform(post("/api/v1/users")
						.header("Authorization", "Bearer " + makerToken)
						.contentType("application/json")
						.content("""
								{
								  "fullName": "Green Checker",
								  "email": "%s",
								  "password": "Checker@12345"
								}
								""".formatted(checkerEmail)))
				.andExpect(status().isCreated());

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

		mockMvc.perform(get("/api/v1/members/" + memberId)
				.header("Authorization", "Bearer " + makerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.savingsBalance", is(125000.00)))
				.andExpect(jsonPath("$.data.sharesBalance", is(0.00)))
				.andExpect(jsonPath("$.data.welfareBalance", is(0.00)));
	}

	@Test
	void invalidFinancialTransactionsAreRejected() throws Exception {
		String token = loginAndReturnToken("admin@greenvalley.local", "Sacco@12345");

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

}
