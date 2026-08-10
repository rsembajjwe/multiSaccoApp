package com.methaltech.sacco.accounting;

import java.time.Instant;

public record IntegrationJobRunResponse(
        String id,
        String jobName,
        String status,
        int scanned,
        int updated,
        int failed,
        String message,
        Instant startedAt,
        Instant finishedAt) {

    static IntegrationJobRunResponse from(IntegrationJobRun run) {
        return new IntegrationJobRunResponse(
                run.getId(),
                run.getJobName(),
                run.getStatus(),
                run.getScanned(),
                run.getUpdated(),
                run.getFailed(),
                run.getMessage(),
                run.getStartedAt(),
                run.getFinishedAt());
    }
}
