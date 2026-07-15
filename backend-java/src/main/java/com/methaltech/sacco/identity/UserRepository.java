package com.methaltech.sacco.identity;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmailIgnoreCase(String email);
    List<User> findAllByOrderByFullNameAsc();
    List<User> findByTenantIdOrderByFullNameAsc(String tenantId);
    boolean existsByTenantIdAndEmailIgnoreCase(String tenantId, String email);
}
