package com.methaltech.sacco.accounting;

import com.methaltech.sacco.api.ApiErrorResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

/**
 * Authenticates inbound mobile-money provider callbacks before they reach the controller.
 *
 * <p>The callback endpoint credits member balances and posts financial transactions, so it must only
 * act on requests that genuinely originate from the configured provider. This filter recomputes the
 * HMAC signature over the raw body via {@link MobileMoneyCallbackVerifier} and short-circuits with a
 * clean {@link ApiErrorResponse} envelope when verification fails, leaving the controller untouched.</p>
 */
@Component
class MobileMoneyCallbackSignatureFilter extends OncePerRequestFilter {

    private static final Set<String> CALLBACK_PATHS = Set.of(
            "/api/v1/integrations/mobile-money/callback",
            "/api/v1/integrations/mobile-money/subscription-callback");

    private final MobileMoneyCallbackVerifier verifier;
    private final ObjectMapper objectMapper;

    MobileMoneyCallbackSignatureFilter(MobileMoneyCallbackVerifier verifier, ObjectMapper objectMapper) {
        this.verifier = verifier;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return !(HttpMethod.POST.matches(request.getMethod()) && uri != null && CALLBACK_PATHS.stream().anyMatch(uri::endsWith));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        CachedBodyHttpServletRequest cached = new CachedBodyHttpServletRequest(request);
        MobileMoneyCallbackVerifier.Outcome outcome = verifier.verify(
                cached.cachedBody(),
                request.getHeader(MobileMoneyCallbackVerifier.SIGNATURE_HEADER),
                request.getHeader(MobileMoneyCallbackVerifier.TIMESTAMP_HEADER));
        if (outcome.accepted()) {
            filterChain.doFilter(cached, response);
            return;
        }
        writeRejection(response, outcome);
    }

    private void writeRejection(HttpServletResponse response, MobileMoneyCallbackVerifier.Outcome outcome) throws IOException {
        HttpStatus status = outcome == MobileMoneyCallbackVerifier.Outcome.NOT_CONFIGURED
                ? HttpStatus.SERVICE_UNAVAILABLE
                : HttpStatus.UNAUTHORIZED;
        String code = switch (outcome) {
            case NOT_CONFIGURED -> "CALLBACK_VERIFICATION_UNAVAILABLE";
            case SIGNATURE_MISSING -> "CALLBACK_SIGNATURE_REQUIRED";
            case TIMESTAMP_INVALID -> "CALLBACK_TIMESTAMP_INVALID";
            default -> "CALLBACK_SIGNATURE_INVALID";
        };
        String message = switch (outcome) {
            case NOT_CONFIGURED -> "Mobile-money callback verification is not configured.";
            case SIGNATURE_MISSING -> "A mobile-money callback signature is required.";
            case TIMESTAMP_INVALID -> "The mobile-money callback timestamp is missing, malformed, or outside the allowed window.";
            default -> "The mobile-money callback signature is invalid.";
        };

        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(objectMapper.writeValueAsString(ApiErrorResponse.of(status.value(), code, message)));
    }
}
