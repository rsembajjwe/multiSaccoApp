package com.methaltech.sacco.finance;

import org.springframework.stereotype.Service;

/**
 * Seeds the three built-in fund sources (Savings, Shares, Welfare) for a newly created SACCO, so the
 * fund-type registry is populated from day one and the Administrator can immediately add custom funds.
 * Public so tenant onboarding (a different package) can trigger provisioning while the entity and
 * repository stay package-private. Idempotent: existing funds for the tenant are left untouched.
 */
@Service
public class FundTypeProvisioningService {

    private final FundTypeRepository fundTypeRepository;

    FundTypeProvisioningService(FundTypeRepository fundTypeRepository) {
        this.fundTypeRepository = fundTypeRepository;
    }

    public void seedDefaults(String tenantId, String createdByUserId) {
        seed(tenantId, "savings", "Savings", 1, createdByUserId);
        seed(tenantId, "shares", "Shares", 2, createdByUserId);
        seed(tenantId, "welfare", "Welfare", 3, createdByUserId);
    }

    private void seed(String tenantId, String code, String name, int displayOrder, String createdByUserId) {
        if (fundTypeRepository.existsByTenantIdAndCodeIgnoreCase(tenantId, code)) return;
        fundTypeRepository.save(new FundType(
                "fundtype_" + tenantId + "_" + code,
                tenantId,
                code,
                name,
                code,           // built-in funds use their own code as their basis
                null,
                true,           // isSystem
                true,           // active
                displayOrder,
                createdByUserId));
    }
}
