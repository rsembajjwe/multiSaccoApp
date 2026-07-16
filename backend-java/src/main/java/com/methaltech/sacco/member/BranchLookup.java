package com.methaltech.sacco.member;

import com.methaltech.sacco.branch.BranchRepository;
import org.springframework.stereotype.Service;

@Service
class BranchLookup {

    private final BranchRepository branchRepository;

    BranchLookup(BranchRepository branchRepository) {
        this.branchRepository = branchRepository;
    }

    boolean existsInTenant(String branchId, String tenantId) {
        if (branchId == null || branchId.isBlank()) return false;
        return branchRepository.findById(branchId.trim())
                .filter(branch -> branch.getTenantId().equals(tenantId))
                .isPresent();
    }
}
