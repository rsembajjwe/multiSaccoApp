package com.methaltech.sacco.tenant;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface FleetIncidentStateRepository extends JpaRepository<FleetIncidentState, String> {
    List<FleetIncidentState> findAllByOrderByUpdatedAtDesc();
}
