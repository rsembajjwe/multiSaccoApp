package com.methaltech.sacco.accounting;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface AccountingPeriodRepository extends JpaRepository<AccountingPeriod, String> {
    List<AccountingPeriod> findAllByOrderByTenantIdAscPeriodDesc();
    List<AccountingPeriod> findByTenantIdOrderByPeriodDesc(String tenantId);
    Optional<AccountingPeriod> findByTenantIdAndPeriod(String tenantId, String period);
}
