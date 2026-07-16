package com.methaltech.sacco.tenant;

import java.time.Instant;

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
                profile.getCreatedAt(),
                profile.getUpdatedAt());
    }
}
