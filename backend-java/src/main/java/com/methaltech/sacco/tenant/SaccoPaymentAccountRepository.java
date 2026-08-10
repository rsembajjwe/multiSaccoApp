package com.methaltech.sacco.tenant;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SaccoPaymentAccountRepository extends JpaRepository<SaccoPaymentAccount, String> {

    List<SaccoPaymentAccount> findByTenantIdOrderByChannelAscCreatedAtAsc(String tenantId);

    List<SaccoPaymentAccount> findByTenantIdAndActiveTrueOrderByChannelAscCreatedAtAsc(String tenantId);

    Optional<SaccoPaymentAccount> findByIdAndTenantId(String id, String tenantId);
}
