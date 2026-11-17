package com.methaltech.sacco.notification;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "sacco_sms_schedules")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class SaccoSmsSchedule {

    @Id
    private String id;
    @Column(name = "tenant_id") private String tenantId;
    private String title;
    private String body;
    @Column(name = "message_mode") private String messageMode;
    @Column(name = "member_ids") private String memberIds;
    @Column(name = "scheduled_at") private Instant scheduledAt;
    private String status;
    @Column(name = "estimated_credits") private int estimatedCredits;
    private int recipients;
    @Column(name = "credits_used") private int creditsUsed;
    @Column(name = "failure_reason") private String failureReason;
    @Column(name = "created_by") private String createdBy;
    @Column(name = "created_at") private Instant createdAt;
    @Column(name = "sent_at") private Instant sentAt;
    @Column(name = "updated_at") private Instant updatedAt;

    SaccoSmsSchedule(String id, String tenantId, String title, String body, String messageMode,
            List<String> memberIds, Instant scheduledAt, int estimatedCredits, String createdBy) {
        this.id = id;
        this.tenantId = tenantId;
        this.title = title;
        this.body = body;
        this.messageMode = messageMode;
        this.memberIds = String.join(",", memberIds);
        this.scheduledAt = scheduledAt;
        this.status = "scheduled";
        this.estimatedCredits = estimatedCredits;
        this.createdBy = createdBy;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    List<String> selectedMemberIds() {
        if (memberIds == null || memberIds.isBlank()) return List.of();
        return java.util.Arrays.stream(memberIds.split(",")).filter(value -> !value.isBlank()).toList();
    }

    void sent(SaccoSmsBroadcastService.SendResult result) {
        status = "sent";
        recipients = result.recipients();
        creditsUsed = result.creditsUsed();
        sentAt = Instant.now();
        updatedAt = sentAt;
        failureReason = null;
    }

    void failed(String reason) {
        status = "failed";
        failureReason = reason == null ? "SMS scheduling failed." : reason.substring(0, Math.min(500, reason.length()));
        updatedAt = Instant.now();
    }

    void cancel() {
        status = "cancelled";
        updatedAt = Instant.now();
    }
}
