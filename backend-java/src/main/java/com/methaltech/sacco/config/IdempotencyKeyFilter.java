package com.methaltech.sacco.config;

import com.methaltech.sacco.api.ApiErrorResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.security.Principal;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

/**
 * Rejects duplicate mutating API submissions when a client supplies an
 * Idempotency-Key header. The staff app sends this on money-changing requests
 * to reduce accidental double-posts during retries or repeated submissions.
 */
@Component
class IdempotencyKeyFilter extends OncePerRequestFilter {

    private final IdempotencyGuard guard;
    private final ObjectMapper objectMapper;

    IdempotencyKeyFilter(IdempotencyGuard guard, ObjectMapper objectMapper) {
        this.guard = guard;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String key = idempotencyKey(request);
        return key == null || key.isBlank() || !isApiMutation(request);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (guard.reserve(scope(request), idempotencyKey(request))) {
            filterChain.doFilter(request, response);
            return;
        }
        response.setStatus(HttpStatus.CONFLICT.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(objectMapper.writeValueAsString(ApiErrorResponse.of(
                HttpStatus.CONFLICT.value(),
                "DUPLICATE_REQUEST",
                "This request was already submitted. Refresh the screen before trying again.")));
    }

    private static boolean isApiMutation(HttpServletRequest request) {
        String uri = request.getRequestURI();
        if (uri == null || !uri.startsWith("/api/v1/")) {
            return false;
        }
        return HttpMethod.POST.matches(request.getMethod())
                || HttpMethod.PATCH.matches(request.getMethod())
                || HttpMethod.PUT.matches(request.getMethod())
                || HttpMethod.DELETE.matches(request.getMethod());
    }

    private static String idempotencyKey(HttpServletRequest request) {
        String key = request.getHeader("Idempotency-Key");
        if (key == null || key.isBlank()) {
            key = request.getHeader("X-Idempotency-Key");
        }
        return key;
    }

    private static String scope(HttpServletRequest request) {
        Principal principal = request.getUserPrincipal();
        String actor = principal == null ? "anonymous" : principal.getName();
        return request.getMethod() + ":" + request.getRequestURI() + ":" + actor;
    }
}
