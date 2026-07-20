package com.methaltech.sacco.identity;

import java.time.Instant;

record PlatformSecurityPolicyResponse(
        String id,
        int minimumPasswordLength,
        boolean requireUppercase,
        boolean requireLowercase,
        boolean requireNumber,
        boolean requireSymbol,
        int passwordExpiryDays,
        int lockoutFailedAttempts,
        int lockoutMinutes,
        Instant updatedAt) {

    static PlatformSecurityPolicyResponse from(PlatformSecurityPolicy policy) {
        return new PlatformSecurityPolicyResponse(
                policy.getId(),
                policy.getMinimumPasswordLength(),
                policy.isRequireUppercase(),
                policy.isRequireLowercase(),
                policy.isRequireNumber(),
                policy.isRequireSymbol(),
                policy.getPasswordExpiryDays(),
                policy.getLockoutFailedAttempts(),
                policy.getLockoutMinutes(),
                policy.getUpdatedAt());
    }
}
