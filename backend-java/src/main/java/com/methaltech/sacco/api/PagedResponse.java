package com.methaltech.sacco.api;

import java.util.List;

/**
 * Envelope for paginated list responses. Serialises as {@code {"data":[...], "page":{...}}}, so a
 * client that only reads {@code data} still works while paginated clients can read the {@code page}
 * metadata.
 */
public record PagedResponse<T>(List<T> data, PageMeta page) {

    public static <T> PagedResponse<T> of(List<T> data, int number, int size, long totalElements, int totalPages) {
        return new PagedResponse<>(data, new PageMeta(number, size, totalElements, totalPages));
    }

    public record PageMeta(int number, int size, long totalElements, int totalPages) {
    }
}
