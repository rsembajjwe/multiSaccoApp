package com.methaltech.sacco.identity;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface UserRoleRepository extends JpaRepository<UserRole, UserRoleId> {
    List<UserRole> findByIdUserId(String userId);
    List<UserRole> findByIdUserIdIn(List<String> userIds);
    void deleteByIdUserId(String userId);
}
