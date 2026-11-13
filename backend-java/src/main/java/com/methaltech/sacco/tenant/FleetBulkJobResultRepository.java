package com.methaltech.sacco.tenant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
interface FleetBulkJobResultRepository extends JpaRepository<FleetBulkJobResult, String> {
    List<FleetBulkJobResult> findByJobIdOrderByTenantIdAsc(String jobId);
    List<FleetBulkJobResult> findByJobIdAndStatusOrderByTenantIdAsc(String jobId, String status);
    Optional<FleetBulkJobResult> findByJobIdAndTenantId(String jobId, String tenantId);
}
