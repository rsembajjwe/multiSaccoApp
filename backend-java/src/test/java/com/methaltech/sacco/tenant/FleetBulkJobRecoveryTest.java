package com.methaltech.sacco.tenant;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class FleetBulkJobRecoveryTest {
    private final FleetBulkJobMetrics metrics = mock(FleetBulkJobMetrics.class);

    @Test
    void dispatchesOnlyQueuedOrganizationResults() {
        FleetBulkJobRepository jobs = mock(FleetBulkJobRepository.class);
        FleetBulkJobResultRepository results = mock(FleetBulkJobResultRepository.class);
        FleetBulkJobDispatcher dispatcher = mock(FleetBulkJobDispatcher.class);
        FleetBulkJob job = approvedJob("job_one", 2, "suspended");
        FleetBulkJobResult queued = new FleetBulkJobResult("result_one", "job_one", "tenant_pending");
        FleetBulkJobResult completed = new FleetBulkJobResult("result_two", "job_one", "tenant_done");
        completed.complete("Done SACCO");
        when(jobs.findByStatusInOrderByCreatedAtAsc(Set.of("queued", "running"))).thenReturn(List.of(job));
        when(jobs.claimForRecovery(eq("job_one"), any(), any(), any(), eq("node-one"))).thenReturn(1);
        when(jobs.findById("job_one")).thenReturn(java.util.Optional.of(job));
        when(results.findByJobIdAndStatusOrderByTenantIdAsc("job_one", "queued")).thenReturn(List.of(queued));

        new FleetBulkJobRecovery(jobs, results, dispatcher, Duration.ofMinutes(15), "node-one", metrics)
                .recoverInterruptedJobsAt(Instant.now().plusSeconds(6));

        verify(dispatcher).dispatch("job_one", List.of("tenant_pending"), "system-startup-recovery");
    }

    @Test
    void finalizesInterruptedJobWhenNoRowsRemainQueued() {
        FleetBulkJobRepository jobs = mock(FleetBulkJobRepository.class);
        FleetBulkJobResultRepository results = mock(FleetBulkJobResultRepository.class);
        FleetBulkJobDispatcher dispatcher = mock(FleetBulkJobDispatcher.class);
        FleetBulkJob job = approvedJob("job_two", 1, "inactive");
        FleetBulkJobResult completed = new FleetBulkJobResult("result_three", "job_two", "tenant_done");
        completed.complete("Done SACCO");
        when(jobs.findByStatusInOrderByCreatedAtAsc(Set.of("queued", "running"))).thenReturn(List.of(job));
        when(jobs.claimForRecovery(eq("job_two"), any(), any(), any(), eq("node-one"))).thenReturn(1);
        when(jobs.findById("job_two")).thenReturn(java.util.Optional.of(job));
        when(results.findByJobIdAndStatusOrderByTenantIdAsc("job_two", "queued")).thenReturn(List.of());
        when(results.findByJobIdOrderByTenantIdAsc("job_two")).thenReturn(List.of(completed));

        new FleetBulkJobRecovery(jobs, results, dispatcher, Duration.ofMinutes(15), "node-one", metrics)
                .recoverInterruptedJobsAt(Instant.now().plusSeconds(6));

        verify(jobs).save(job);
        org.junit.jupiter.api.Assertions.assertEquals("completed", job.getStatus());
        org.junit.jupiter.api.Assertions.assertEquals(1, job.getSucceededCount());
    }

    @Test
    void watchdogRecoversJobsWithExpiredHeartbeats() {
        FleetBulkJobRepository jobs = mock(FleetBulkJobRepository.class);
        FleetBulkJobResultRepository results = mock(FleetBulkJobResultRepository.class);
        FleetBulkJobDispatcher dispatcher = mock(FleetBulkJobDispatcher.class);
        FleetBulkJob stale = approvedJob("job_stale", 1, "active");
        when(jobs.findByStatusInOrderByCreatedAtAsc(Set.of("queued", "running"))).thenReturn(List.of(stale));
        when(jobs.claimForRecovery(eq("job_stale"), any(), any(), any(), eq("node-one"))).thenReturn(1);
        when(jobs.findById("job_stale")).thenReturn(java.util.Optional.of(stale));
        FleetBulkJobResult pending = new FleetBulkJobResult("result_pending", "job_stale", "tenant_one");
        when(results.findByJobIdAndStatusOrderByTenantIdAsc("job_stale", "queued")).thenReturn(List.of(pending));

        FleetBulkJobRecovery recovery = new FleetBulkJobRecovery(jobs, results, dispatcher, Duration.ofMinutes(15), "node-one", metrics);
        recovery.recoverStaleJobsAt(Instant.now().plus(Duration.ofMinutes(16)));

        verify(dispatcher).dispatch("job_stale", List.of("tenant_one"), "system-watchdog-recovery");
        verify(jobs).claimForRecovery(eq("job_stale"), any(), any(), any(), eq("node-one"));
        verify(metrics).recovered("system-watchdog-recovery");
    }

    @Test
    void watchdogLeavesFreshJobsRunning() {
        FleetBulkJobRepository jobs = mock(FleetBulkJobRepository.class);
        FleetBulkJobResultRepository results = mock(FleetBulkJobResultRepository.class);
        FleetBulkJobDispatcher dispatcher = mock(FleetBulkJobDispatcher.class);
        FleetBulkJob fresh = approvedJob("job_fresh", 1, "active");
        when(jobs.findByStatusInOrderByCreatedAtAsc(Set.of("queued", "running"))).thenReturn(List.of(fresh));

        FleetBulkJobRecovery recovery = new FleetBulkJobRecovery(jobs, results, dispatcher, Duration.ofMinutes(15), "node-one", metrics);
        recovery.recoverStaleJobsAt(Instant.now().plus(Duration.ofMinutes(10)));

        org.mockito.Mockito.verifyNoInteractions(results, dispatcher);
        verify(jobs, never()).claimForRecovery(any(), any(), any(), any(), any());
    }

    @Test
    void competingNodeDoesNothingWhenRecoveryClaimIsAlreadyHeld() {
        FleetBulkJobRepository jobs = mock(FleetBulkJobRepository.class);
        FleetBulkJobResultRepository results = mock(FleetBulkJobResultRepository.class);
        FleetBulkJobDispatcher dispatcher = mock(FleetBulkJobDispatcher.class);
        FleetBulkJob stale = approvedJob("job_claimed", 1, "active");
        when(jobs.findByStatusInOrderByCreatedAtAsc(Set.of("queued", "running"))).thenReturn(List.of(stale));
        when(jobs.claimForRecovery(eq("job_claimed"), any(), any(), any(), eq("node-two"))).thenReturn(0);

        FleetBulkJobRecovery recovery = new FleetBulkJobRecovery(jobs, results, dispatcher, Duration.ofMinutes(15), "node-two", metrics);
        recovery.recoverStaleJobsAt(Instant.now().plus(Duration.ofMinutes(16)));

        verify(jobs, never()).findById("job_claimed");
        org.mockito.Mockito.verifyNoInteractions(results, dispatcher);
    }

    private FleetBulkJob approvedJob(String id, int requestedCount, String targetStatus) {
        FleetBulkJob job = new FleetBulkJob(id, "user_one", "Operator", requestedCount,
                targetStatus, null, null, "Operational test request");
        job.approve("user_two", "Checker", "Scope verified");
        return job;
    }
}
