package com.methaltech.sacco.tenant;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface SaccoProfileRepository extends JpaRepository<SaccoProfile, String> {
    Optional<SaccoProfile> findByTenantId(String tenantId);
}
