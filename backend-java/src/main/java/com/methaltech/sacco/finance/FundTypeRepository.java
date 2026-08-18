package com.methaltech.sacco.finance;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface FundTypeRepository extends JpaRepository<FundType, String> {

    List<FundType> findByTenantIdOrderByDisplayOrderAscNameAsc(String tenantId);

    List<FundType> findAllByOrderByTenantIdAscDisplayOrderAscNameAsc();

    Optional<FundType> findByIdAndTenantId(String id, String tenantId);

    boolean existsByTenantIdAndCodeIgnoreCase(String tenantId, String code);

    boolean existsByTenantIdAndCodeIgnoreCaseAndActiveTrue(String tenantId, String code);
}
