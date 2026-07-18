package com.methaltech.sacco.identity;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmailIgnoreCase(String email);
    Optional<User> findByTenantIdAndEmailIgnoreCase(String tenantId, String email);
    Optional<User> findByTenantIdAndPhone(String tenantId, String phone);
    List<User> findAllByOrderByFullNameAsc();
    List<User> findByTenantIdOrderByFullNameAsc(String tenantId);
    boolean existsByTenantIdAndEmailIgnoreCase(String tenantId, String email);
}
