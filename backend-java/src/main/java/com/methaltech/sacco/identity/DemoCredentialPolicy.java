package com.methaltech.sacco.identity;

import java.util.Locale;
import java.util.Set;
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
    private static final Set<String> MEMBER_IDENTIFIERS = Set.of(
            "gvs-0001",
            "gvs-0002",
            "gvs-0003",
            "+256701234567",
            "+256772222118",
            "+256756300101",
            "amina@example.local",
            "daniel@example.local");

    private final boolean demoLoginsEnabled;

    DemoCredentialPolicy(@Value("${sacco.demo-logins.enabled:true}") boolean demoLoginsEnabled) {
        this.demoLoginsEnabled = demoLoginsEnabled;
    }

    boolean staffLoginAllowed(String email) {
        return demoLoginsEnabled || !STAFF_IDENTIFIERS.contains(normalize(email));
    }

    public boolean memberLoginAllowed(String identifier) {
        return demoLoginsEnabled || !MEMBER_IDENTIFIERS.contains(normalize(identifier));
    }

    public boolean demoLoginsEnabled() {
        return demoLoginsEnabled;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}
