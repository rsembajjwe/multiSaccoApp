package com.methaltech.sacco.config;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.member.MemberAuthService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

/**
 * Default-deny authentication guard. Every {@code /api/v1} request must carry a valid staff or member
 * bearer token, except an explicit allowlist of genuinely public endpoints. Defence in depth: individual
 * controllers still resolve and authorise their own sessions. Keep {@link #PUBLIC_ENDPOINTS} in sync with
 * {@code AuthorizationCoverageTest}.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 30)
class AuthenticationGuardFilter extends OncePerRequestFilter {

    private static final Set<String> PUBLIC_ENDPOINTS = Set.of(
            "GET /api/v1/health",
            "POST /api/v1/auth/login",
            "POST /api/v1/auth/first-login-password",
            "POST /api/v1/auth/mfa/verify",
            "POST /api/v1/auth/password-reset/request",
            "POST /api/v1/auth/password-reset/confirm",
            "POST /api/v1/member-auth/login",
            "POST /api/v1/member-auth/password-reset/request",
            "POST /api/v1/member-auth/password-reset/confirm",
            "POST /api/v1/integrations/mobile-money/callback",
            "POST /api/v1/integrations/mobile-money/subscription-callback",
            "POST /api/v1/public/sacco-registrations");

    private final AuthService authService;
    private final MemberAuthService memberAuthService;
    private final ObjectMapper objectMapper;

    AuthenticationGuardFilter(AuthService authService, MemberAuthService memberAuthService, ObjectMapper objectMapper) {
        this.authService = authService;
        this.memberAuthService = memberAuthService;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        if (uri == null || !uri.startsWith("/api/v1/")) {
            return true;
        }
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        return isPublic(request.getMethod(), uri);
    }

    private boolean isPublic(String method, String uri) {
        if (uri.startsWith("/api/v1/public/")) {
            return true;
        }
        return PUBLIC_ENDPOINTS.contains(method.toUpperCase() + " " + uri);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String authorization = request.getHeader("Authorization");
        boolean authenticated = authService.currentSession(authorization) != null
                || memberAuthService.currentSession(authorization) != null;
        if (!authenticated) {
            final boolean member = isMemberRoute(request.getRequestURI());
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write(objectMapper.writeValueAsString(ApiErrorResponse.of(
                    HttpStatus.UNAUTHORIZED.value(),
                    member ? "MEMBER_AUTH_REQUIRED" : "AUTH_REQUIRED",
                    member ? "A valid member bearer token is required."
                           : "A valid bearer token is required.")));
            return;
        }
        filterChain.doFilter(request, response);
    }

    /** Member-namespace routes get the member-specific 401 code the member controllers use. */
    private boolean isMemberRoute(String uri) {
        return uri != null
                && (uri.startsWith("/api/v1/member-auth/")
                        || uri.equals("/api/v1/integrations/mobile-money/payment-requests"));
    }
}
