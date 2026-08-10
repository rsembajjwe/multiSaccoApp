package com.methaltech.sacco.accounting;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "integration_job_runs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class IntegrationJobRun {

    @Id
    private String id;

    @Column(name = "job_name")
    private String jobName;

    private String status;

    @Column(name = "scanned_count")
    private int scanned;

    @Column(name = "updated_count")
    private int updated;

    @Column(name = "failed_count")
    private int failed;

    private String message;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;

    @Column(name = "created_at")
    private Instant createdAt;

    IntegrationJobRun(
            String id,
            String jobName,
            String status,
            int scanned,
            int updated,
            int failed,
            String message,
            Instant startedAt,
            Instant finishedAt) {
        this.id = id;
        this.jobName = jobName;
        this.status = status;
        this.scanned = scanned;
        this.updated = updated;
        this.failed = failed;
        this.message = message;
        this.startedAt = startedAt;
        this.finishedAt = finishedAt;
        this.createdAt = finishedAt;
    }
}
