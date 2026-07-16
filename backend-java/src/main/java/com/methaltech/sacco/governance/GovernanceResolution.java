package com.methaltech.sacco.governance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "governance_resolutions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class GovernanceResolution {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "meeting_id")
    private String meetingId;

    private String title;
    private String decision;

    @Column(name = "owner_user_id")
    private String ownerUserId;

    @Column(name = "due_date")
    private LocalDate dueDate;

    private String status;

    @Column(name = "created_by_user_id")
    private String createdByUserId;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    GovernanceResolution(
            String id,
            String tenantId,
            String meetingId,
            String title,
            String decision,
            String ownerUserId,
            LocalDate dueDate,
            String status,
            String createdByUserId) {
        this.id = id;
        this.tenantId = tenantId;
        this.meetingId = meetingId;
        this.title = title;
        this.decision = decision;
        this.ownerUserId = ownerUserId;
        this.dueDate = dueDate;
        this.status = status;
        this.createdByUserId = createdByUserId;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }
}
