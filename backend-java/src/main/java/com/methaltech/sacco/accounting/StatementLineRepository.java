package com.methaltech.sacco.accounting;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface StatementLineRepository extends JpaRepository<StatementLine, String> {
    List<StatementLine> findAllByOrderByTenantIdAscStatementDateDescCreatedAtDesc();
    List<StatementLine> findByTenantIdOrderByStatementDateDescCreatedAtDesc(String tenantId);
    boolean existsByTenantIdAndExternalReferenceIgnoreCase(String tenantId, String externalReference);
}
