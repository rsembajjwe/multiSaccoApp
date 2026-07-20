package com.methaltech.sacco.identity;

record UserResponse(
        String id,
        String tenantId,
        String fullName,
        String email,
        String phone,
        String status,
        boolean mfaEnabled,
        long activeSessionCount) {

    static UserResponse from(User user) {
        return from(user, 0);
    }

    static UserResponse from(User user, long activeSessionCount) {
        return new UserResponse(
                user.getId(),
                user.getTenantId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getStatus(),
                user.isMfaEnabled(),
                activeSessionCount);
    }
}
