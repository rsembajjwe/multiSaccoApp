package com.methaltech.sacco.finance;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SavingsTransferRepository extends JpaRepository<SavingsTransfer, String> {

    List<SavingsTransfer> findByTenantIdOrderByCreatedAtDesc(String tenantId);

    List<SavingsTransfer> findAllByOrderByTenantIdAscCreatedAtDesc();

    boolean existsByTenantIdAndReferenceIgnoreCase(String tenantId, String reference);
}
