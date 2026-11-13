package com.methaltech.sacco.branch;

import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DefaultBranchProvisioningService {

    private final BranchRepository branchRepository;

    public DefaultBranchProvisioningService(BranchRepository branchRepository) {
        this.branchRepository = branchRepository;
    }

    @Transactional
    public Branch ensureMainBranch(String tenantId, String saccoCode, String address, String managerUserId) {
        return branchRepository.findByTenantIdOrderByCodeAsc(tenantId).stream()
                .findFirst()
                .orElseGet(() -> branchRepository.save(new Branch(
                        "branch_" + UUID.randomUUID(),
                        tenantId,
                        mainBranchCode(saccoCode),
                        "Main Branch",
                        address == null ? "" : address.trim(),
                        managerUserId == null || managerUserId.isBlank() ? null : managerUserId.trim(),
                        "active")));
    }

    private String mainBranchCode(String saccoCode) {
        String prefix = saccoCode == null ? "SACCO" : saccoCode.trim().toUpperCase().replaceAll("[^A-Z0-9]", "");
        if (prefix.isBlank()) prefix = "SACCO";
        return prefix.substring(0, Math.min(prefix.length(), 24)) + "-MAIN";
    }
}