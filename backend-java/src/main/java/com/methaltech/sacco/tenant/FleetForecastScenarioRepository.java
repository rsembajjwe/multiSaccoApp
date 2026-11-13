package com.methaltech.sacco.tenant;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface FleetForecastScenarioRepository extends JpaRepository<FleetForecastScenario, String> {
    List<FleetForecastScenario> findByUserIdOrderByNameAsc(String userId);
    Optional<FleetForecastScenario> findByIdAndUserId(String id, String userId);
    boolean existsByUserIdAndNameIgnoreCase(String userId, String name);
    long countByUserId(String userId);
}
