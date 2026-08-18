package com.methaltech.sacco.finance;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface FundingSourceRepository extends JpaRepository<FundingSource, String> {

    List<FundingSource> findByTenantIdOrderByDateReceivedDescCreatedAtDesc(String tenantId);

    List<FundingSource> findAllByOrderByTenantIdAscDateReceivedDescCreatedAtDesc();

    Optional<FundingSource> findByIdAndTenantId(String id, String tenantId);
}
