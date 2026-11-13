package com.methaltech.sacco.api;

import com.methaltech.sacco.notification.OnboardingNotificationService.OnboardingDeliveryException;
import jakarta.persistence.OptimisticLockException;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestControllerAdvice
class GlobalApiExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalApiExceptionHandler.class);

    @ExceptionHandler({OptimisticLockException.class, OptimisticLockingFailureException.class})
    ResponseEntity<ApiErrorResponse> concurrentUpdate() {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiErrorResponse.of(
                        409,
                        "CONCURRENT_UPDATE",
                        "This record was updated by another request. Reload and try again."));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiErrorResponse> dataIntegrityConflict(DataIntegrityViolationException error) {
        log.warn("Database integrity conflict: {}", mostSpecificMessage(error));
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiErrorResponse.of(
                        409,
                        "DATA_INTEGRITY_CONFLICT",
                        "This request conflicts with an existing record or database rule."));
    }

    private String mostSpecificMessage(Throwable error) {
        Throwable cause = error;
        while (cause.getCause() != null) cause = cause.getCause();
        return cause.getMessage() == null ? error.getClass().getSimpleName() : cause.getMessage();
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiErrorResponse> validationFailed(MethodArgumentNotValidException error) {
        String fields = error.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getField)
                .distinct()
                .collect(Collectors.joining(", "));
        String suffix = fields.isBlank() ? "" : " Check: " + fields + ".";
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiErrorResponse.of(
                        400,
                        "VALIDATION_FAILED",
                        "Request validation failed." + suffix));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiErrorResponse> malformedRequestBody() {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiErrorResponse.of(
                        400,
                        "MALFORMED_REQUEST_BODY",
                        "Request body is missing or malformed."));
    }

    @ExceptionHandler(OnboardingDeliveryException.class)
    ResponseEntity<ApiErrorResponse> onboardingDeliveryUnavailable(OnboardingDeliveryException error) {
        log.warn("Staff onboarding delivery failed: {}", error.getMessage());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(ApiErrorResponse.of(503, "ONBOARDING_DELIVERY_FAILED", error.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiErrorResponse> unexpectedError(Exception error) {
        log.error("Unhandled API exception", error);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiErrorResponse.of(
                        500,
                        "INTERNAL_SERVER_ERROR",
                        "Something went wrong. Please try again or contact support with the request time."));
    }
}
