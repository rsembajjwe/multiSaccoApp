package com.methaltech.sacco.api;

import java.time.Instant;

public record ApiErrorResponse(ApiError error) {

    public static ApiErrorResponse of(int status, String code, String message) {
        return new ApiErrorResponse(new ApiError(Instant.now(), status, code, message));
    }

    public record ApiError(Instant timestamp, int status, String code, String message) {
    }
}
