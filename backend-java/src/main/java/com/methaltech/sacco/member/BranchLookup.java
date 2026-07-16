package com.methaltech.sacco.member;

import com.methaltech.sacco.branch.BranchRepository;
import java.time.Instant;
import java.util.Optional;
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

    Optional<BranchSummary> findSummary(String branchId) {
        if (branchId == null || branchId.isBlank()) return Optional.empty();
        return branchRepository.findById(branchId.trim()).map(branch -> new BranchSummary(
                branch.getId(),
                branch.getTenantId(),
                branch.getCode(),
                branch.getName(),
                branch.getAddress(),
                branch.getManagerUserId(),
                branch.getStatus(),
                branch.getCreatedAt(),
                branch.getUpdatedAt()));
    }

    record BranchSummary(
            String id,
            String tenantId,
            String code,
            String name,
            String address,
            String managerUserId,
            String status,
            Instant createdAt,
            Instant updatedAt) {
    }
}
