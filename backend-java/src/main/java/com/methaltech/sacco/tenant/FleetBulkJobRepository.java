package com.methaltech.sacco.tenant;
import java.util.List;
import java.util.Collection;
import java.time.Instant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
interface FleetBulkJobRepository extends JpaRepository<FleetBulkJob, String> {
    List<FleetBulkJob> findTop20ByRequestedByOrderByCreatedAtDesc(String requestedBy);
    List<FleetBulkJob> findTop20ByOrderByCreatedAtDesc();
    Page<FleetBulkJob> findByStatus(String status, Pageable pageable);
    Page<FleetBulkJob> findByStatusAndApprovalDueSoonAtLessThanEqual(String status, Instant now, Pageable pageable);
    Page<FleetBulkJob> findByStatusAndApprovalDueAtIsNull(String status, Pageable pageable);
    long countByStatus(String status);
    long countByStatusAndRequestedBy(String status, String requestedBy);
    long countByStatusAndApprovalDueAtLessThanEqual(String status, Instant now);
    long countByStatusAndApprovalDueSoonAtLessThanEqualAndApprovalDueAtAfter(
            String status, Instant warningAt, Instant overdueAt);
    List<FleetBulkJob> findByStatusInOrderByCreatedAtAsc(Collection<String> statuses);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("""
            update FleetBulkJob job
               set job.heartbeatAt = :claimedAt,
                   job.lastRecoveredAt = :claimedAt,
                   job.lastRecoveredBy = :claimedBy,
                   job.recoveryCount = job.recoveryCount + 1
             where job.id = :jobId
               and job.status in :statuses
               and (job.heartbeatAt is null or job.heartbeatAt < :staleBefore)
            """)
    int claimForRecovery(@Param("jobId") String jobId,
            @Param("statuses") Collection<String> statuses,
            @Param("staleBefore") Instant staleBefore,
            @Param("claimedAt") Instant claimedAt,
            @Param("claimedBy") String claimedBy);
}
