package com.methaltech.sacco.tenant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "fleet_bulk_job_results")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class FleetBulkJobResult {
    @Id private String id;
    @Column(name = "job_id") private String jobId;
    @Column(name = "tenant_id") private String tenantId;
    @Column(name = "tenant_name") private String tenantName;
    private String status;
    private String message;
    @Column(name = "processed_at") private Instant processedAt;

    FleetBulkJobResult(String id, String jobId, String tenantId) {
        this.id = id;
        this.jobId = jobId;
        this.tenantId = tenantId;
        this.status = "queued";
    }
    void complete(String tenantName) {
        this.tenantName = tenantName;
        this.status = "completed";
        this.message = "Update applied.";
        this.processedAt = Instant.now();
    }
    void fail(String tenantName, String message) {
        this.tenantName = tenantName;
        this.status = "failed";
        this.message = message == null || message.isBlank() ? "Update failed." : message.substring(0, Math.min(500, message.length()));
        this.processedAt = Instant.now();
    }
}
