package com.methaltech.sacco.identity;

import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
class PlatformSecurityPolicyService {

    static final String DEFAULT_POLICY_ID = "platform_default";

    private final PlatformSecurityPolicyRepository repository;

    PlatformSecurityPolicyService(PlatformSecurityPolicyRepository repository) {
        this.repository = repository;
    }

    PlatformSecurityPolicy currentPolicy() {
        return repository.findById(DEFAULT_POLICY_ID)
                .orElseGet(() -> repository.save(new PlatformSecurityPolicy(
                        DEFAULT_POLICY_ID,
                        10,
                        true,
                        true,
                        true,
                        false,
                        90,
                        5,
                        15)));
    }

    List<String> passwordViolations(String password) {
        PlatformSecurityPolicy policy = currentPolicy();
        String value = password == null ? "" : password;
        List<String> violations = new ArrayList<>();
        if (value.length() < policy.getMinimumPasswordLength()) {
            violations.add("be at least " + policy.getMinimumPasswordLength() + " characters");
        }
        if (policy.isRequireUppercase() && value.chars().noneMatch(Character::isUpperCase)) {
            violations.add("include an uppercase letter");
        }
        if (policy.isRequireLowercase() && value.chars().noneMatch(Character::isLowerCase)) {
            violations.add("include a lowercase letter");
        }
        if (policy.isRequireNumber() && value.chars().noneMatch(Character::isDigit)) {
            violations.add("include a number");
        }
        if (policy.isRequireSymbol() && value.chars().noneMatch(character -> !Character.isLetterOrDigit(character))) {
            violations.add("include a symbol");
        }
        return violations;
    }

    String passwordPolicyMessage(List<String> violations) {
        if (violations.isEmpty()) return "";
        return "Password must " + String.join(", ", violations) + ".";
    }
}
