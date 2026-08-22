package com.methaltech.sacco.tenant;

import java.time.Instant;
import java.math.BigDecimal;

record SaccoProfileResponse(
        String id,
        String tenantId,
        String legalName,
        String tin,
        String umraLicenseNo,
        String cooperativeRegistrationNo,
        String address,
        String email,
        String phone,
        String website,
        String membershipDuesPeriod,
        Integer membershipCalendarStartMonth,
        Integer membershipCalendarStartDay,
        BigDecimal membershipSubscriptionAmount,
        Instant createdAt,
        Instant updatedAt) {

    static SaccoProfileResponse from(SaccoProfile profile) {
        return new SaccoProfileResponse(
                profile.getId(),
                profile.getTenantId(),
                profile.getLegalName(),
                profile.getTin(),
                profile.getUmraLicenseNo(),
                profile.getCooperativeRegistrationNo(),
                profile.getAddress(),
                profile.getEmail(),
                profile.getPhone(),
                profile.getWebsite(),
                profile.getMembershipDuesPeriod(),
                profile.getMembershipCalendarStartMonth(),
                profile.getMembershipCalendarStartDay(),
                profile.getMembershipSubscriptionAmount(),
                profile.getCreatedAt(),
                profile.getUpdatedAt());
    }
}
