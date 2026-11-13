package com.methaltech.sacco.tenant;

import com.methaltech.sacco.identity.AuditService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class FleetBulkJobDispatcher {
    private final FleetBulkJobRepository jobRepository;
    private final FleetBulkJobResultRepository resultRepository;
    private final TenantRepository tenantRepository;
    private final AuditService auditService;
    private final FleetBulkJobMetrics metrics;

    @Async("notificationExecutor")
    public void dispatch(String jobId, List<String> tenantIds, String ipAddress) {
        FleetBulkJob job = jobRepository.findById(jobId).orElseThrow();
        job.start();
        jobRepository.save(job);
        List<FleetBulkJobResult> existingResults = resultRepository.findByJobIdOrderByTenantIdAsc(jobId);
        int succeeded = (int) existingResults.stream().filter(result -> "completed".equals(result.getStatus())).count();
        int failed = (int) existingResults.stream().filter(result -> "failed".equals(result.getStatus())).count();
        for (String tenantId : tenantIds) {
            FleetBulkJobResult result = resultRepository.findByJobIdAndTenantId(jobId, tenantId).orElseThrow();
            if (!"queued".equals(result.getStatus())) continue;
            try {
                Tenant tenant = tenantRepository.findById(tenantId).orElseThrow(() -> new IllegalArgumentException("Organization not found."));
                if ("tenant_platform".equals(tenant.getId())) throw new IllegalArgumentException("Platform tenant cannot be changed.");
                if (job.getTargetStatus() != null) tenant.updateStatus(job.getTargetStatus());
                if (job.getAccountManagerUserId() != null || job.getAccountManagerName() != null) {
                    tenant.assignAccountManager(job.getAccountManagerUserId(), job.getAccountManagerName());
                }
                tenantRepository.save(tenant);
                auditService.record(tenant.getId(), job.getRequestedBy(), job.getRequestedByName(),
                        "Asynchronous fleet bulk update", "tenant", tenant.getId(), ipAddress);
                result.complete(tenant.getName());
                succeeded++;
                metrics.organizationProcessed("completed");
            } catch (Exception exception) {
                result.fail(null, exception.getMessage());
                failed++;
                metrics.organizationProcessed("failed");
            }
            resultRepository.save(result);
            job.heartbeat();
            jobRepository.save(job);
        }
        job.finish(succeeded, failed);
        jobRepository.save(job);
        metrics.completed(job.getStatus());
    }
}
