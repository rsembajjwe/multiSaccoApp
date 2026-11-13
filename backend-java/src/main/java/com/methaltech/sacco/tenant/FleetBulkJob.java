package com.methaltech.sacco.tenant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "fleet_bulk_jobs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class FleetBulkJob {
    @Id private String id;
    @Column(name = "requested_by") private String requestedBy;
    @Column(name = "requested_by_name") private String requestedByName;
    @Column(name = "requested_count") private int requestedCount;
    @Column(name = "succeeded_count") private int succeededCount;
    @Column(name = "failed_count") private int failedCount;
    private String status;
    @Column(name = "target_status") private String targetStatus;
    @Column(name = "account_manager_user_id") private String accountManagerUserId;
    @Column(name = "account_manager_name") private String accountManagerName;
    @Column(name = "request_reason") private String requestReason;
    @Column(name = "approval_due_soon_at") private Instant approvalDueSoonAt;
    @Column(name = "approval_due_at") private Instant approvalDueAt;
    @Column(name = "decided_by") private String decidedBy;
    @Column(name = "decided_by_name") private String decidedByName;
    @Column(name = "decision_reason") private String decisionReason;
    @Column(name = "decided_at") private Instant decidedAt;
    @Column(name = "created_at") private Instant createdAt;
    @Column(name = "started_at") private Instant startedAt;
    @Column(name = "finished_at") private Instant finishedAt;
    @Column(name = "heartbeat_at") private Instant heartbeatAt;
    @Column(name = "recovery_count") private int recoveryCount;
    @Column(name = "last_recovered_at") private Instant lastRecoveredAt;
    @Column(name = "last_recovered_by") private String lastRecoveredBy;
    @Version private Long version;

    FleetBulkJob(String id, String requestedBy, String requestedByName, int requestedCount,
            String targetStatus, String accountManagerUserId, String accountManagerName, String requestReason) {
        this.id = id;
        this.requestedBy = requestedBy;
        this.requestedByName = requestedByName;
        this.requestedCount = requestedCount;
        this.targetStatus = clean(targetStatus);
        this.accountManagerUserId = accountManagerUserId;
        this.accountManagerName = accountManagerName;
        this.requestReason = clean(requestReason);
        this.status = "pending_approval";
        this.createdAt = Instant.now();
        this.heartbeatAt = this.createdAt;
    }

    void approve(String userId, String userName, String reason) {
        requirePendingDecision();
        if (requestedBy.equals(userId)) throw new IllegalStateException("The requesting operator cannot approve this job.");
        this.status = "queued";
        recordDecision(userId, userName, reason);
        this.heartbeatAt = Instant.now();
    }

    void assignApprovalDeadlines(Instant dueSoonAt, Instant dueAt) {
        if (this.approvalDueSoonAt != null && this.approvalDueAt != null) return;
        if (dueSoonAt == null || dueAt == null || dueAt.isBefore(dueSoonAt)) {
            throw new IllegalArgumentException("Approval deadlines are invalid.");
        }
        this.approvalDueSoonAt = dueSoonAt;
        this.approvalDueAt = dueAt;
    }

    void reject(String userId, String userName, String reason) {
        requirePendingDecision();
        if (requestedBy.equals(userId)) throw new IllegalStateException("The requesting operator cannot reject this job.");
        this.status = "rejected";
        recordDecision(userId, userName, reason);
        this.finishedAt = Instant.now();
        this.heartbeatAt = this.finishedAt;
    }

    void start() {
        if (!"queued".equals(this.status)) throw new IllegalStateException("Fleet job is not approved for execution.");
        this.status = "running";
        if (this.startedAt == null) this.startedAt = Instant.now();
        this.heartbeatAt = Instant.now();
        this.finishedAt = null;
    }
    void heartbeat() { this.heartbeatAt = Instant.now(); }
    boolean isStale(Instant cutoff) {
        Instant lastActivity = heartbeatAt != null ? heartbeatAt : startedAt != null ? startedAt : createdAt;
        return lastActivity != null && lastActivity.isBefore(cutoff);
    }
    void finish(int succeeded, int failed) {
        this.succeededCount = succeeded;
        this.failedCount = failed;
        this.status = failed == 0 ? "completed" : succeeded == 0 ? "failed" : "completed_with_errors";
        this.finishedAt = Instant.now();
        this.heartbeatAt = this.finishedAt;
    }
    private void requirePendingDecision() {
        if (!"pending_approval".equals(this.status)) throw new IllegalStateException("Fleet job has already been decided.");
    }
    private void recordDecision(String userId, String userName, String reason) {
        this.decidedBy = userId;
        this.decidedByName = clean(userName);
        this.decisionReason = clean(reason);
        this.decidedAt = Instant.now();
    }
    private String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
