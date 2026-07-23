package com.methaltech.sacco.identity;

import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class DemoCredentialPolicy {

    private static final Set<String> STAFF_IDENTIFIERS = Set.of(
            "admin@platform.local",
            "operations@platform.local",
            "billing@platform.local",
            "compliance@platform.local",
            "support@platform.local",
            "admin@greenvalley.local",
            "admin@lakefarmers.local",
            "treasurer@greenvalley.local",
            "secretary@greenvalley.local",
            "chairperson@greenvalley.local");
    private static final Set<String> STAFF_DEMO_DOMAINS = Set.of(
            "@platform.local",
            "@greenvalley.local",
            "@lakefarmers.local");
    private static final Set<String> MEMBER_IDENTIFIERS = Set.of(
            "gvs-0001",
            "gvs-0002",
            "gvs-0003",
            "+256701234567",
            "+256772222118",
            "+256756300101",
            "amina@example.local",
            "daniel@example.local");
    private static final Set<String> MEMBER_DEMO_DOMAINS = Set.of("@example.local");
    private static final Pattern MEMBER_DEMO_NUMBER = Pattern.compile("gvs-000\\d+");

    private final boolean demoLoginsEnabled;

    DemoCredentialPolicy(@Value("${sacco.demo-logins.enabled:true}") boolean demoLoginsEnabled) {
        this.demoLoginsEnabled = demoLoginsEnabled;
    }

    boolean staffLoginAllowed(String email) {
        String normalized = normalize(email);
        return demoLoginsEnabled || !(STAFF_IDENTIFIERS.contains(normalized) || endsWithAny(normalized, STAFF_DEMO_DOMAINS));
    }

    public boolean memberLoginAllowed(String identifier) {
        String normalized = normalize(identifier);
        return demoLoginsEnabled || !(MEMBER_IDENTIFIERS.contains(normalized)
                || endsWithAny(normalized, MEMBER_DEMO_DOMAINS)
                || MEMBER_DEMO_NUMBER.matcher(normalized).matches());
    }

    public boolean demoLoginsEnabled() {
        return demoLoginsEnabled;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private boolean endsWithAny(String value, Set<String> suffixes) {
        return suffixes.stream().anyMatch(value::endsWith);
    }
}
