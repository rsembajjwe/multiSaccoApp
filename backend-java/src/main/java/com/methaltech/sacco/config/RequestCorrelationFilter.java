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
    static final String MDC_KEY = "correlationId";

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        String correlationId = resolveCorrelationId(request);
        MDC.put(MDC_KEY, correlationId);
        response.setHeader(CORRELATION_ID_HEADER, correlationId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(MDC_KEY);
        }
    }

    private String resolveCorrelationId(HttpServletRequest request) {
        String provided = firstNonBlank(
                request.getHeader(CORRELATION_ID_HEADER),
                request.getHeader(LEGACY_REQUEST_ID_HEADER));
        if (provided == null) {
            return UUID.randomUUID().toString();
        }
        // Bound the length and strip control characters so a hostile header cannot poison logs.
        String sanitized = provided.replaceAll("[\\p{Cntrl}]", "").trim();
        if (sanitized.isEmpty()) {
            return UUID.randomUUID().toString();
        }
        return sanitized.length() > 64 ? sanitized.substring(0, 64) : sanitized;
    }

    private static String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) return a;
        if (b != null && !b.isBlank()) return b;
        return null;
    }
}
