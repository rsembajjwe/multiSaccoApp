package com.methaltech.sacco.tenant;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TenantRepository extends JpaRepository<Tenant, String> {
    List<Tenant> findAllByOrderByNameAsc();
    Optional<Tenant> findByAbbreviationIgnoreCase(String abbreviation);
    Optional<Tenant> findByRegistrationNoIgnoreCase(String registrationNo);
}
