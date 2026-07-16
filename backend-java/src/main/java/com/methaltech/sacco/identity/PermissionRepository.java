package com.methaltech.sacco.identity;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface PermissionRepository extends JpaRepository<Permission, String> {
    List<Permission> findAllByOrderByModuleAscActionAsc();
}
