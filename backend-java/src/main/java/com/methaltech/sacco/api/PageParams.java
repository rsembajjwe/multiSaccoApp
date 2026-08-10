package com.methaltech.sacco.api;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/**
 * Helper for optional, backward-compatible pagination on list endpoints. Pagination is only applied
 * when a caller supplies {@code page} and/or {@code size}; otherwise endpoints keep their existing
 * full-list behaviour. Page size is clamped to a safe maximum so a caller cannot request unbounded
 * result sets.
 */
public final class PageParams {

    public static final int DEFAULT_SIZE = 50;
    public static final int MAX_SIZE = 200;

    private PageParams() {
    }

    /** True when the caller opted into pagination by supplying page and/or size. */
    public static boolean requested(Integer page, Integer size) {
        return page != null || size != null;
    }

    /** Builds a clamped {@link Pageable}: page defaults to 0, size to {@value #DEFAULT_SIZE}, max {@value #MAX_SIZE}. */
    public static Pageable toPageable(Integer page, Integer size, Sort sort) {
        int resolvedPage = (page == null || page < 0) ? 0 : page;
        int resolvedSize = (size == null) ? DEFAULT_SIZE : Math.min(Math.max(size, 1), MAX_SIZE);
        return PageRequest.of(resolvedPage, resolvedSize, sort);
    }
}
