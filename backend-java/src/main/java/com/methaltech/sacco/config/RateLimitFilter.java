package com.methaltech.sacco.config;

import com.methaltech.sacco.api.ApiErrorResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

/**
 * Per-IP rate limiting for abuse-prone endpoints that lack their own throttling: MFA verification and
 * password-reset requests, member mobile-money payment initiation, and provider callbacks (flood
 * ceiling). Requests over the limit are rejected with HTTP 429 and a {@code Retry-After} header before
 * reaching any controller. Login endpoints are intentionally excluded — they use the precise,
 * failure-based {@code LoginAttemptService} lockout instead.
 *
 * <p>Runs early (just after correlation id assignment) so throttled traffic never touches auth or
 * business logic. Limits are per client IP and configurable; behind the reverse proxy the real client
 * IP is resolved via {@code server.forward-headers-strategy}.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimiter rateLimiter;
    private final ObjectMapper objectMapper;
    private final boolean enabled;
    private final Duration window;
    private final int authCapacity;
    private final int paymentCapacity;
    private final int callbackCapacity;

    RateLimitFilter(
            RateLimiter rateLimiter,
            ObjectMapper objectMapper,
            @Value("${sacco.rate-limit.enabled:true}") boolean enabled,
            @Value("${sacco.rate-limit.window:60s}") Duration window,
            @Value("${sacco.rate-limit.auth-per-window:30}") int authCapacity,
            @Value("${sacco.rate-limit.payment-per-window:20}") int paymentCapacity,
            @Value("${sacco.rate-limit.callback-per-window:600}") int callbackCapacity) {
        this.rateLimiter = rateLimiter;
        this.objectMapper = objectMapper;
        this.enabled = enabled;
        this.window = window;
        this.authCapacity = authCapacity;
        this.paymentCapacity = paymentCapacity;
        this.callbackCapacity = callbackCapacity;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !enabled || policyFor(request) == null;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        Policy policy = policyFor(request);
        if (policy == null) {
            filterChain.doFilter(request, response);
            return;
        }
        String key = policy.name() + ":" + clientIp(request);
        if (rateLimiter.tryAcquire(key, policy.capacity(), window)) {
            filterChain.doFilter(request, response);
        } else {
            writeTooManyRequests(response);
        }
    }

    private Policy policyFor(HttpServletRequest request) {
        if (!HttpMethod.POST.matches(request.getMethod())) {
            return null;
        }
        String uri = request.getRequestURI();
        if (uri == null) {
            return null;
        }
        // NB: /auth/login and /member-auth/login are deliberately NOT rate limited here — they already
        // have precise, failure-based lockout via LoginAttemptService. Adding a coarse per-IP limit on
        // them would count successful logins and, behind a shared/proxy IP, lock out legitimate users.
        if (uri.endsWith("/api/v1/auth/mfa/verify")
                || uri.endsWith("/api/v1/auth/password-reset/request")) {
            return new Policy("auth", authCapacity);
        }
        if (uri.endsWith("/api/v1/integrations/mobile-money/payment-requests")) {
            return new Policy("payment", paymentCapacity);
        }
        if (uri.endsWith("/api/v1/integrations/mobile-money/callback")
                || uri.endsWith("/api/v1/integrations/mobile-money/subscription-callback")) {
            return new Policy("callback", callbackCapacity);
        }
        return null;
    }

    private String clientIp(HttpServletRequest request) {
        String remote = request.getRemoteAddr();
        return remote == null || remote.isBlank() ? "unknown" : remote;
    }

    private void writeTooManyRequests(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setHeader("Retry-After", Long.toString(Math.max(1, window.toSeconds())));
        response.getWriter().write(objectMapper.writeValueAsString(ApiErrorResponse.of(
                HttpStatus.TOO_MANY_REQUESTS.value(),
                "RATE_LIMIT_EXCEEDED",
                "Too many requests. Please slow down and try again shortly.")));
    }

    private record Policy(String name, int capacity) {
    }
}
