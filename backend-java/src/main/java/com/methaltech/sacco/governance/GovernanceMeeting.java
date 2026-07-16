package com.methaltech.sacco.governance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "governance_meetings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class GovernanceMeeting {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    private String title;

    @Column(name = "meeting_type")
    private String meetingType;

    @Column(name = "scheduled_at")
    private Instant scheduledAt;

    @Column(name = "chair_user_id")
    private String chairUserId;

    private String status;
    private String minutes;

    @Column(name = "created_by_user_id")
    private String createdByUserId;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    GovernanceMeeting(
            String id,
            String tenantId,
            String title,
            String meetingType,
            Instant scheduledAt,
            String chairUserId,
            String status,
            String minutes,
            String createdByUserId) {
        this.id = id;
        this.tenantId = tenantId;
        this.title = title;
        this.meetingType = meetingType;
        this.scheduledAt = scheduledAt;
        this.chairUserId = chairUserId;
        this.status = status;
        this.minutes = minutes;
        this.createdByUserId = createdByUserId;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    void touch() {
        this.updatedAt = Instant.now();
    }
}
