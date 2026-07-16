package com.methaltech.sacco.notification;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "notifications")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "member_id")
    private String memberId;

    private String channel;

    @Column(name = "event_type")
    private String eventType;

    private String title;
    private String body;
    private String status;

    @Column(name = "resource_type")
    private String resourceType;

    @Column(name = "resource_id")
    private String resourceId;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "read_at")
    private Instant readAt;

    Notification(
            String id,
            String tenantId,
            String memberId,
            String eventType,
            String title,
            String body,
            String resourceType,
            String resourceId) {
        this.id = id;
        this.tenantId = tenantId;
        this.memberId = memberId;
        this.channel = "in_app";
        this.eventType = eventType;
        this.title = title;
        this.body = body;
        this.status = "unread";
        this.resourceType = resourceType;
        this.resourceId = resourceId;
        this.createdAt = Instant.now();
    }
}
