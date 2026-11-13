package com.methaltech.sacco.tenant;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
class FleetBulkJobRecovery {
    private static final Set<String> INTERRUPTED_STATUSES = Set.of("queued", "running");
    private static final Duration STARTUP_GRACE = Duration.ofSeconds(5);
    private final FleetBulkJobRepository jobRepository;
    private final FleetBulkJobResultRepository resultRepository;
    private final FleetBulkJobDispatcher dispatcher;
    private final Duration staleAfter;
    private final String instanceId;
    private final FleetBulkJobMetrics metrics;

    FleetBulkJobRecovery(FleetBulkJobRepository jobRepository,
            FleetBulkJobResultRepository resultRepository,
            FleetBulkJobDispatcher dispatcher,
            @Value("${sacco.fleet.bulk-job.watchdog.stale-after:PT15M}") Duration staleAfter,
            @Value("${sacco.instance-id:${HOSTNAME:local}-${random.uuid}}") String instanceId,
            FleetBulkJobMetrics metrics) {
        this.jobRepository = jobRepository;
        this.resultRepository = resultRepository;
        this.dispatcher = dispatcher;
        this.staleAfter = staleAfter;
        this.instanceId = instanceId;
        this.metrics = metrics;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void recoverInterruptedJobs() {
        recoverInterruptedJobsAt(Instant.now());
    }

    void recoverInterruptedJobsAt(Instant now) {
        Instant cutoff = now.minus(STARTUP_GRACE);
        jobRepository.findByStatusInOrderByCreatedAtAsc(INTERRUPTED_STATUSES)
                .stream()
                .filter(job -> job.isStale(cutoff))
                .forEach(job -> claimAndRecover(job, cutoff, now, "system-startup-recovery"));
    }

    @Scheduled(
            fixedDelayString = "${sacco.fleet.bulk-job.watchdog.fixed-delay:PT5M}",
            initialDelayString = "${sacco.fleet.bulk-job.watchdog.initial-delay:PT2M}")
    public void recoverStaleJobs() {
        recoverStaleJobsAt(Instant.now());
    }

    void recoverStaleJobsAt(Instant now) {
        Instant cutoff = now.minus(staleAfter);
        jobRepository.findByStatusInOrderByCreatedAtAsc(INTERRUPTED_STATUSES).stream()
                .filter(job -> job.isStale(cutoff))
                .forEach(job -> claimAndRecover(job, cutoff, now, "system-watchdog-recovery"));
    }

    private void claimAndRecover(FleetBulkJob candidate, Instant cutoff, Instant claimedAt, String recoverySource) {
        int claimed = jobRepository.claimForRecovery(candidate.getId(), INTERRUPTED_STATUSES, cutoff, claimedAt, instanceId);
        if (claimed != 1) return;
        metrics.recovered(recoverySource);
        FleetBulkJob job = jobRepository.findById(candidate.getId()).orElseThrow();
        List<String> pendingTenantIds = resultRepository
                .findByJobIdAndStatusOrderByTenantIdAsc(job.getId(), "queued").stream()
                .map(FleetBulkJobResult::getTenantId)
                .toList();
        if (pendingTenantIds.isEmpty()) {
            finishFromExistingResults(job);
        } else {
            dispatcher.dispatch(job.getId(), pendingTenantIds, recoverySource);
        }
    }

    private void finishFromExistingResults(FleetBulkJob job) {
        List<FleetBulkJobResult> results = resultRepository.findByJobIdOrderByTenantIdAsc(job.getId());
        int succeeded = (int) results.stream().filter(result -> "completed".equals(result.getStatus())).count();
        int failed = (int) results.stream().filter(result -> "failed".equals(result.getStatus())).count();
        job.finish(succeeded, failed);
        jobRepository.save(job);
    }
}
