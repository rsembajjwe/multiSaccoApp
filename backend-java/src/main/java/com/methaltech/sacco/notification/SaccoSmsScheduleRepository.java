package com.methaltech.sacco.notification;

import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface SaccoSmsScheduleRepository extends JpaRepository<SaccoSmsSchedule, String> {
    List<SaccoSmsSchedule> findByTenantIdOrderByCreatedAtDesc(String tenantId);
    List<SaccoSmsSchedule> findTop100ByStatusAndScheduledAtLessThanEqualOrderByScheduledAtAsc(String status, Instant scheduledAt);

    @Modifying
    @Query("UPDATE SaccoSmsSchedule s SET s.status = 'processing', s.updatedAt = :now WHERE s.id = :id AND s.status = 'scheduled'")
    int claim(@Param("id") String id, @Param("now") Instant now);
}
