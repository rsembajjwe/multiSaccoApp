package com.methaltech.sacco.tenant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.methaltech.sacco.identity.AuditService;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class FleetBulkJobDispatcherTest {

    @Test
    void resumesQueuedRowsAndFinishesWithSuccessAndFailureCounts() {
        FleetBulkJobRepository jobs = mock(FleetBulkJobRepository.class);
        FleetBulkJobResultRepository results = mock(FleetBulkJobResultRepository.class);
        TenantRepository tenants = mock(TenantRepository.class);
        AuditService audit = mock(AuditService.class);
        FleetBulkJobMetrics metrics = mock(FleetBulkJobMetrics.class);
        FleetBulkJob job = approvedJob("job_dispatch", "suspended", "manager_one", "Manager One");
        FleetBulkJobResult priorSuccess = new FleetBulkJobResult("result_prior", job.getId(), "tenant_prior");
        priorSuccess.complete("Prior SACCO");
        FleetBulkJobResult priorFailure = new FleetBulkJobResult("result_failed", job.getId(), "tenant_failed");
        priorFailure.fail("Failed SACCO", "Earlier failure");
        FleetBulkJobResult successful = new FleetBulkJobResult("result_success", job.getId(), "tenant_green");
        FleetBulkJobResult platform = new FleetBulkJobResult("result_platform", job.getId(), "tenant_platform");
        FleetBulkJobResult alreadyDone = new FleetBulkJobResult("result_done", job.getId(), "tenant_done");
        alreadyDone.complete("Done SACCO");
        Tenant green = tenant("tenant_green", "Green Valley SACCO");
        Tenant platformTenant = tenant("tenant_platform", "Platform");

        when(jobs.findById(job.getId())).thenReturn(Optional.of(job));
        when(results.findByJobIdOrderByTenantIdAsc(job.getId()))
                .thenReturn(List.of(priorSuccess, priorFailure));
        when(results.findByJobIdAndTenantId(job.getId(), "tenant_green")).thenReturn(Optional.of(successful));
        when(results.findByJobIdAndTenantId(job.getId(), "tenant_platform")).thenReturn(Optional.of(platform));
        when(results.findByJobIdAndTenantId(job.getId(), "tenant_done")).thenReturn(Optional.of(alreadyDone));
        when(tenants.findById("tenant_green")).thenReturn(Optional.of(green));
        when(tenants.findById("tenant_platform")).thenReturn(Optional.of(platformTenant));

        new FleetBulkJobDispatcher(jobs, results, tenants, audit, metrics)
                .dispatch(job.getId(), List.of("tenant_green", "tenant_platform", "tenant_done"), "127.0.0.1");

        assertEquals("suspended", green.getStatus());
        assertEquals("manager_one", green.getAccountManagerUserId());
        assertEquals("Manager One", green.getAccountManagerName());
        assertEquals("completed", successful.getStatus());
        assertEquals("failed", platform.getStatus());
        assertTrue(platform.getMessage().contains("Platform tenant"));
        assertEquals("completed_with_errors", job.getStatus());
        assertEquals(2, job.getSucceededCount());
        assertEquals(2, job.getFailedCount());
        verify(tenants).save(green);
        verify(tenants, never()).save(platformTenant);
        verify(audit).record(eq("tenant_green"), eq("requester"), eq("Requester"),
                eq("Asynchronous fleet bulk update"), eq("tenant"), eq("tenant_green"), eq("127.0.0.1"));
        verify(metrics).organizationProcessed("completed");
        verify(metrics).organizationProcessed("failed");
        verify(metrics).completed("completed_with_errors");
        verify(results, never()).save(alreadyDone);
    }

    @Test
    void supportsJobsThatOnlyAssignAnAccountManager() {
        FleetBulkJobRepository jobs = mock(FleetBulkJobRepository.class);
        FleetBulkJobResultRepository results = mock(FleetBulkJobResultRepository.class);
        TenantRepository tenants = mock(TenantRepository.class);
        AuditService audit = mock(AuditService.class);
        FleetBulkJobMetrics metrics = mock(FleetBulkJobMetrics.class);
        FleetBulkJob job = approvedJob("job_assignment", null, null, "Unassigned");
        FleetBulkJobResult result = new FleetBulkJobResult("result_assignment", job.getId(), "tenant_lake");
        Tenant tenant = tenant("tenant_lake", "Lake SACCO");

        when(jobs.findById(job.getId())).thenReturn(Optional.of(job));
        when(results.findByJobIdOrderByTenantIdAsc(job.getId())).thenReturn(List.of());
        when(results.findByJobIdAndTenantId(job.getId(), "tenant_lake")).thenReturn(Optional.of(result));
        when(tenants.findById("tenant_lake")).thenReturn(Optional.of(tenant));

        new FleetBulkJobDispatcher(jobs, results, tenants, audit, metrics)
                .dispatch(job.getId(), List.of("tenant_lake"), "10.0.0.1");

        assertEquals("completed", job.getStatus());
        assertEquals(1, job.getSucceededCount());
        assertEquals(0, job.getFailedCount());
        assertEquals("Unassigned", tenant.getAccountManagerName());
        verify(jobs, org.mockito.Mockito.atLeast(3)).save(job);
        verify(results).save(result);
        verify(metrics).completed("completed");
    }

    private FleetBulkJob approvedJob(
            String id, String targetStatus, String managerUserId, String managerName) {
        FleetBulkJob job = new FleetBulkJob(
                id, "requester", "Requester", 3, targetStatus, managerUserId, managerName, "Operational change");
        job.approve("approver", "Approver", "Verified");
        return job;
    }

    private Tenant tenant(String id, String name) {
        return new Tenant(id, name, id.substring(0, Math.min(4, id.length())).toUpperCase(),
                "REG-" + id, "Kampala", LocalDate.now().plusYears(1), "starter");
    }
}
