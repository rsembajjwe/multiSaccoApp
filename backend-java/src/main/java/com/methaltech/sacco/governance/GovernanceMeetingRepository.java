package com.methaltech.sacco.governance;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface GovernanceMeetingRepository extends JpaRepository<GovernanceMeeting, String> {
    List<GovernanceMeeting> findAllByOrderByTenantIdAscScheduledAtDesc();
    List<GovernanceMeeting> findByTenantIdOrderByScheduledAtDesc(String tenantId);
}
