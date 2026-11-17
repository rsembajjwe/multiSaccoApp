package com.methaltech.sacco.config;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.member.MemberAuthService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import tools.jackson.databind.ObjectMapper;

class AuthenticationGuardFilterTest {

    private final AuthenticationGuardFilter filter = new AuthenticationGuardFilter(
            mock(AuthService.class),
            mock(MemberAuthService.class),
            new ObjectMapper());

    @Test
    void explicitlyAllowedPublicRegistrationRouteSkipsAuthentication() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/public/group-registrations");

        assertTrue(filter.shouldNotFilter(request));
    }

    @Test
    void unlistedPublicNamespaceRouteRequiresAuthentication() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/public/internal-diagnostics");

        assertFalse(filter.shouldNotFilter(request));
    }

    @Test
    void allowedPathWithWrongMethodRequiresAuthentication() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/public/sacco-registrations");

        assertFalse(filter.shouldNotFilter(request));
    }
}
