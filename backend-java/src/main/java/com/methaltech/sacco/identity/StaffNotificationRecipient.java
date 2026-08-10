package com.methaltech.sacco.identity;

public record StaffNotificationRecipient(
        String userId,
        String tenantId,
        String fullName,
        String email) {
}
