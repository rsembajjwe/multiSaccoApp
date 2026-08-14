package com.methaltech.sacco.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Assigns a correlation id to every request so log lines can be traced end to end. The id is taken
 * from an inbound {@code X-Request-Id}/{@code X-Correlation-Id} header when present (so an upstream
 * gateway or the SPA can propagate one), otherwise a new UUID is generated. It is placed in the SLF4J
 * MDC under {@code correlationId} (surfaced by the logging pattern) and echoed back on the response
 * so clients and operators can quote it when reporting an issue.
 *
 * <p>Runs first so the id is present for every downstream filter, controller and error handler.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
class RequestCorrelationFilter extends OncePerRequestFilter {

    static final String CORRELATION_ID_HEADER = "X-Correlation-Id";
    static final String LEGACY_REQUEST_ID_HEADER = "X-Request-Id";
    static final String CORRELATION_ID_MDC_KEY = "correlationId";
    static final String METHOD_MDC_KEY = "requestMethod";
    static final String PATH_MDC_KEY = "requestPath";
    static final String CLIENT_IP_MDC_KEY = "clientIp";

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        String correlationId = resolveCorrelationId(request);
        MDC.put(CORRELATION_ID_MDC_KEY, correlationId);
        MDC.put(METHOD_MDC_KEY, sanitizeForLogs(request.getMethod(), 16));
        MDC.put(PATH_MDC_KEY, sanitizeForLogs(request.getRequestURI(), 200));
        MDC.put(CLIENT_IP_MDC_KEY, clientIp(request));
        response.setHeader(CORRELATION_ID_HEADER, correlationId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(CORRELATION_ID_MDC_KEY);
            MDC.remove(METHOD_MDC_KEY);
            MDC.remove(PATH_MDC_KEY);
            MDC.remove(CLIENT_IP_MDC_KEY);
        }
    }

    private String resolveCorrelationId(HttpServletRequest request) {
        String provided = firstNonBlank(
                request.getHeader(CORRELATION_ID_HEADER),
                request.getHeader(LEGACY_REQUEST_ID_HEADER));
        if (provided == null) {
            return UUID.randomUUID().toString();
        }
        String sanitized = sanitizeForLogs(provided, 64);
        if (sanitized.isEmpty()) {
            return UUID.randomUUID().toString();
        }
        return sanitized;
    }

    private String clientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return sanitizeForLogs(forwardedFor.split(",")[0], 64);
        }
        return sanitizeForLogs(request.getRemoteAddr(), 64);
    }

    private static String sanitizeForLogs(String value, int maxLength) {
        if (value == null) return "";
        // Bound the length and strip control characters so hostile headers cannot poison logs.
        String sanitized = value.replaceAll("[\\p{Cntrl}]", "").trim();
        return sanitized.length() > maxLength ? sanitized.substring(0, maxLength) : sanitized;
    }

    private static String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) return a;
        if (b != null && !b.isBlank()) return b;
        return null;
    }
}
