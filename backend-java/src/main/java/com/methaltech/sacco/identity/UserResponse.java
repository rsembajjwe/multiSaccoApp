package com.methaltech.sacco.identity;

record UserResponse(
        String id,
        String tenantId,
        String fullName,
        String email,
        String phone,
        String status) {

    static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getTenantId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getStatus());
    }
}
