package com.methaltech.sacco.tenant;

import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class OrganizationCodeGenerator {

    private static final Set<String> IGNORED_WORDS = Set.of(
            "SACCO", "COOPERATIVE", "COOP", "LIMITED", "LTD", "THE", "AND", "OF", "CBO", "GROUP");

    private final TenantRepository tenantRepository;

    public OrganizationCodeGenerator(TenantRepository tenantRepository) {
        this.tenantRepository = tenantRepository;
    }

    public String nextCode(String organizationName) {
        String base = baseCode(organizationName);
        if (isAvailable(base)) return base;

        for (int index = 0; index < 26 * 26; index++) {
            String candidate = base.substring(0, 2)
                    + (char) ('A' + (index / 26))
                    + (char) ('A' + (index % 26));
            if (isAvailable(candidate)) return candidate;
        }

        throw new IllegalStateException("Could not allocate a unique organization code.");
    }

    String baseCode(String organizationName) {
        String normalized = organizationName == null ? "" : organizationName
                .toUpperCase(Locale.ROOT)
                .replaceAll("[^A-Z\\s]", " ")
                .trim();
        String source = Arrays.stream(normalized.split("\\s+"))
                .filter(word -> !word.isBlank())
                .filter(word -> !IGNORED_WORDS.contains(word))
                .reduce("", String::concat);
        return ((source.isBlank() ? "ORGN" : source) + "ORGN").substring(0, 4);
    }

    private boolean isAvailable(String code) {
        return !tenantRepository.existsByAbbreviationIgnoreCase(code);
    }
}
