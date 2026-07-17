package com.methaltech.sacco.finance;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface FinancialAccountRepository extends JpaRepository<FinancialAccount, String> {
    List<FinancialAccount> findAllByOrderByTenantIdAscMemberIdAscAccountTypeAsc();
    List<FinancialAccount> findByTenantIdOrderByMemberIdAscAccountTypeAsc(String tenantId);
    List<FinancialAccount> findByTenantIdAndMemberIdOrderByAccountTypeAsc(String tenantId, String memberId);
    List<FinancialAccount> findByTenantIdAndAccountTypeOrderByMemberIdAsc(String tenantId, String accountType);
    long countByTenantIdAndAccountType(String tenantId, String accountType);
    boolean existsByTenantIdAndAccountNoIgnoreCase(String tenantId, String accountNo);
    boolean existsByMemberIdAndProductId(String memberId, String productId);
}
