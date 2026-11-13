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
@Table(name = "fleet_incident_states")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class FleetIncidentState {
    @Id
    @Column(name = "incident_key")
    private String incidentKey;
    @Column(name = "tenant_id")
    private String tenantId;
    @Column(name = "issue_type")
    private String issueType;
    @Column(name = "workflow_status")
    private String workflowStatus;
    @Column(name = "assignee_user_id")
    private String assigneeUserId;
    @Column(name = "assignee_name")
    private String assigneeName;
    @Column(name = "acknowledged_at")
    private Instant acknowledgedAt;
    @Column(name = "resolved_at")
    private Instant resolvedAt;
    @Column(name = "resolution_note")
    private String resolutionNote;
    @Column(name = "escalated_at")
    private Instant escalatedAt;
    @Column(name = "escalated_by_user_id")
    private String escalatedByUserId;
    @Column(name = "escalated_by_name")
    private String escalatedByName;
    @Column(name = "updated_at")
    private Instant updatedAt;

    FleetIncidentState(String incidentKey, String tenantId, String issueType) {
        this.incidentKey = incidentKey;
        this.tenantId = tenantId;
        this.issueType = issueType;
        this.workflowStatus = "open";
        this.updatedAt = Instant.now();
    }

    void acknowledge(String userId, String name) {
        this.workflowStatus = "acknowledged";
        this.assigneeUserId = userId;
        this.assigneeName = name;
        if (this.acknowledgedAt == null) this.acknowledgedAt = Instant.now();
        this.resolvedAt = null;
        this.resolutionNote = null;
        this.updatedAt = Instant.now();
    }

    void assign(String userId, String name) {
        this.assigneeUserId = userId;
        this.assigneeName = name;
        if ("open".equals(this.workflowStatus)) {
            this.workflowStatus = "acknowledged";
            if (this.acknowledgedAt == null) this.acknowledgedAt = Instant.now();
        }
        this.updatedAt = Instant.now();
    }

    void escalate(String actorUserId, String actorName, String assigneeUserId, String assigneeName) {
        this.workflowStatus = "escalated";
        this.escalatedAt = Instant.now();
        this.escalatedByUserId = actorUserId;
        this.escalatedByName = actorName;
        this.assigneeUserId = assigneeUserId;
        this.assigneeName = assigneeName;
        if (this.acknowledgedAt == null) this.acknowledgedAt = this.escalatedAt;
        this.resolvedAt = null;
        this.resolutionNote = null;
        this.updatedAt = this.escalatedAt;
    }

    void resolve(String userId, String name, String note) {
        if (this.acknowledgedAt == null) this.acknowledgedAt = Instant.now();
        this.workflowStatus = "resolved";
        this.assigneeUserId = userId;
        this.assigneeName = name;
        this.resolvedAt = Instant.now();
        this.resolutionNote = note.trim();
        this.updatedAt = Instant.now();
    }

    void reopen() {
        this.workflowStatus = "open";
        this.resolvedAt = null;
        this.resolutionNote = null;
        this.updatedAt = Instant.now();
    }
}
