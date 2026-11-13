package com.methaltech.sacco.tenant;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface TenantRepository extends JpaRepository<Tenant, String>, JpaSpecificationExecutor<Tenant> {
    List<Tenant> findAllByOrderByNameAsc();
    Optional<Tenant> findByAbbreviationIgnoreCase(String abbreviation);
    boolean existsByAbbreviationIgnoreCase(String abbreviation);
    Optional<Tenant> findByRegistrationNoIgnoreCase(String registrationNo);
}
