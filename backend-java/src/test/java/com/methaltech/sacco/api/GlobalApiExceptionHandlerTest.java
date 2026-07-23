package com.methaltech.sacco.api;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class GlobalApiExceptionHandlerTest {

    @Test
    void unexpectedErrorsUseSanitizedApiEnvelope() {
        GlobalApiExceptionHandler handler = new GlobalApiExceptionHandler();

        ResponseEntity<ApiErrorResponse> response = handler.unexpectedError(
                new RuntimeException("raw internal exception detail"));

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertEquals("INTERNAL_SERVER_ERROR", response.getBody().error().code());
        assertEquals(500, response.getBody().error().status());
        assertFalse(response.getBody().error().message().contains("raw internal exception detail"));
    }

    @Test
    void malformedBodiesUseClientErrorEnvelope() {
        GlobalApiExceptionHandler handler = new GlobalApiExceptionHandler();

        ResponseEntity<ApiErrorResponse> response = handler.malformedRequestBody();

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("MALFORMED_REQUEST_BODY", response.getBody().error().code());
    }
}
