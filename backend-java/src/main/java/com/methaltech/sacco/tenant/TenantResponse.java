package com.methaltech.sacco.tenant;

import java.time.Instant;
import java.time.LocalDate;

public record TenantResponse(
        String id,
        String name,
        String abbreviation,
        String status,
        String registrationNo,
        String district,
        String country,
        String localeCode,
        String currencyCode,
        int currencyDigits,
        LocalDate licenseExpiry,
        String packageId,
        int onboarding,
        String allowedCollectionMode,
        boolean mobileMoneyCollectionActive,
        boolean bankCollectionActive,
        boolean mobileMoneyCollectionAvailable,
        boolean bankCollectionAvailable,
        Instant createdAt,
        Instant updatedAt,
        String accountManagerUserId,
        String accountManagerName) {

    public static TenantResponse from(Tenant tenant) {
        return new TenantResponse(
                tenant.getId(),
                tenant.getName(),
                tenant.getAbbreviation(),
                tenant.getStatus(),
                tenant.getRegistrationNo(),
                tenant.getDistrict(),
                tenant.getCountry(),
                tenant.getLocaleCode(),
                tenant.getCurrencyCode(),
                tenant.getCurrencyDigits(),
                tenant.getLicenseExpiry(),
                tenant.getPackageId(),
                tenant.getOnboarding(),
                tenant.getAllowedCollectionMode().name(),
                tenant.isMobileMoneyCollectionActive(),
                tenant.isBankCollectionActive(),
                tenant.mobileMoneyCollectionAvailable(),
                tenant.bankCollectionAvailable(),
                tenant.getCreatedAt(),
                tenant.getUpdatedAt(),
                tenant.getAccountManagerUserId(),
                tenant.getAccountManagerName());
    }
}
