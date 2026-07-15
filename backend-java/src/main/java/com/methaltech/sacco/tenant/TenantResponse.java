package com.methaltech.sacco.tenant;

import java.time.LocalDate;

public record TenantResponse(
        String id,
        String name,
        String abbreviation,
        String status,
        String registrationNo,
        String district,
        LocalDate licenseExpiry,
        String packageId,
        int onboarding) {

    public static TenantResponse from(Tenant tenant) {
        return new TenantResponse(
                tenant.getId(),
                tenant.getName(),
                tenant.getAbbreviation(),
                tenant.getStatus(),
                tenant.getRegistrationNo(),
                tenant.getDistrict(),
                tenant.getLicenseExpiry(),
                tenant.getPackageId(),
                tenant.getOnboarding());
    }
}
