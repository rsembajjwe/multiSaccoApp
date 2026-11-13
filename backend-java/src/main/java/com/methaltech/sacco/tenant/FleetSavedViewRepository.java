package com.methaltech.sacco.tenant;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface FleetSavedViewRepository extends JpaRepository<FleetSavedView, String> {
    List<FleetSavedView> findByUserIdOrderByNameAsc(String userId);
    Optional<FleetSavedView> findByIdAndUserId(String id, String userId);
    long countByUserId(String userId);
    boolean existsByUserIdAndNameIgnoreCase(String userId, String name);
}
