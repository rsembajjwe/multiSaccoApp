package com.methaltech.sacco.config;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import tools.jackson.databind.ObjectMapper;

class IdempotencyKeyFilterTest {

    @Test
    void rejectsDuplicateMutatingRequestWithSameKeyAndScope() throws Exception {
        IdempotencyKeyFilter filter = new IdempotencyKeyFilter(
                new IdempotencyGuard(new InMemoryIdempotencyStore(), Duration.ofMinutes(5)),
                new ObjectMapper());

        MockHttpServletRequest first = request("duplicate-key");
        MockHttpServletResponse firstResponse = new MockHttpServletResponse();
        filter.doFilter(first, firstResponse, new MockFilterChain());

        MockHttpServletRequest second = request("duplicate-key");
        MockHttpServletResponse secondResponse = new MockHttpServletResponse();
        filter.doFilter(second, secondResponse, new MockFilterChain());

        assertEquals(200, firstResponse.getStatus());
        assertEquals(409, secondResponse.getStatus());
    }

    @Test
    void allowsMutatingRequestWithoutIdempotencyKeyForBackwardCompatibility() throws Exception {
        IdempotencyKeyFilter filter = new IdempotencyKeyFilter(
                new IdempotencyGuard(new InMemoryIdempotencyStore(), Duration.ofMinutes(5)),
                new ObjectMapper());

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/financial-transactions");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(200, response.getStatus());
    }

    private static MockHttpServletRequest request(String key) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/financial-transactions");
        request.addHeader("Idempotency-Key", key);
        return request;
    }
}
