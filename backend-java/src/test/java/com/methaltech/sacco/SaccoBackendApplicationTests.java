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
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
		mockMvc.perform(get("/api/v1/tenants"))
				.andExpect(status().isOk())
				.andExpect(header().string("X-Content-Type-Options", "nosniff"))
				.andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(3)))
				.andExpect(jsonPath("$.data[0].name", is("Green Valley SACCO")))
				.andExpect(jsonPath("$.data[0].registrationNo", is("COOP/GVS/2018/014")))
				.andExpect(jsonPath("$.data[0].packageId", is("starter")));
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

	private String loginAndReturnToken() throws Exception {
		MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
						.contentType("application/json")
						.content("""
								{
								  "email": "admin@platform.local",
								  "password": "Admin@12345"
								}
								"""))
				.andExpect(status().isOk())
				.andReturn();

		JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
		return root.path("data").path("token").asString();
	}

}
