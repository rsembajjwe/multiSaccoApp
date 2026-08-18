package com.methaltech.sacco.config;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.subscription.SubscriptionRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

/**
 * Puts a SACCO into read-only mode once its platform subscription has expired: mutating requests
 * (POST/PUT/PATCH/DELETE) are rejected with HTTP 402 so staff can still read data and, crucially, still
 * pay to renew. Reads, authentication, member endpoints, platform endpoints and the subscription/renewal
 * paths are always allowed. Disabled by default ({@code sacco.subscription.enforcement-enabled}) so it is
 * enabled deliberately per environment.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 40)
class SubscriptionEnforcementFilter extends OncePerRequestFilter {

    private final AuthService authService;
    private final SubscriptionRepository subscriptionRepository;
    private final ObjectMapper objectMapper;
    private final boolean enabled;

    SubscriptionEnforcementFilter(
            AuthService authService,
            SubscriptionRepository subscriptionRepository,
            ObjectMapper objectMapper,
            @Value("${sacco.subscription.enforcement-enabled:false}") boolean enabled) {
        this.authService = authService;
        this.subscriptionRepository = subscriptionRepository;
        this.objectMapper = objectMapper;
        this.enabled = enabled;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!enabled) {
            return true;
        }
        String method = request.getMethod();
        boolean mutating = "POST".equals(method) || "PUT".equals(method) || "PATCH".equals(method) || "DELETE".equals(method);
        return !mutating || isExempt(request.getRequestURI());
    }

    private boolean isExempt(String path) {
        if (path == null || !path.startsWith("/api/v1/")) {
            return true;
        }
        return path.startsWith("/api/v1/auth/")
                || path.startsWith("/api/v1/member-auth/")
                || path.startsWith("/api/v1/subscriptions")
                || path.startsWith("/api/v1/subscription-packages")
                || path.startsWith("/api/v1/platform")
                || path.contains("/subscription-callback");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        AuthService.CurrentSession session = authService.currentSession(request.getHeader("Authorization"));
        if (session != null && !authService.isPlatform(session.user())) {
            String tenantId = session.user().getTenantId();
            boolean expired = tenantId != null && subscriptionRepository.findFirstByTenantIdOrderByCreatedAtDesc(tenantId)
                    .map(subscription -> "expired".equals(subscription.getStatus()))
                    .orElse(false);
            if (expired) {
                writeSubscriptionExpired(response);
                return;
            }
        }
        filterChain.doFilter(request, response);
    }

    private void writeSubscriptionExpired(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.PAYMENT_REQUIRED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(objectMapper.writeValueAsString(ApiErrorResponse.of(
                HttpStatus.PAYMENT_REQUIRED.value(),
                "SUBSCRIPTION_EXPIRED",
                "Your SACCO subscription has expired. Renew the subscription to continue making changes.")));
    }
}
