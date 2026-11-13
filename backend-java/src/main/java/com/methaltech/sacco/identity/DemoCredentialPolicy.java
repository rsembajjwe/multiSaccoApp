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
            "gree-0001",
            "gree-0002",
            "gree-0003",
            "+256701234567",
            "+256772222118",
            "+256756300101",
            "amina@example.local",
            "daniel@example.local");
    private static final Set<String> MEMBER_DEMO_DOMAINS = Set.of("@example.local");
    // Low-numbered GREE-/LAKE- memberships (0000-0019) are demo seed accounts; real members are
    // numbered far higher (e.g. GREE-8244) and are never blocked. Kept in step with the demo seed
    // range so newer demo members (GREE-0010..0012, LAKE-0001) are covered too.
    private static final Pattern MEMBER_DEMO_NUMBER = Pattern.compile("(gree|lake)-00[01]\\d");

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
