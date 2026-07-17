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
@Table(name = "notification_templates")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class NotificationTemplate {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    private String channel;

    @Column(name = "event_type")
    private String eventType;

    private String title;
    private String body;
    private String status;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    NotificationTemplate(
            String id,
            String tenantId,
            String channel,
            String eventType,
            String title,
            String body,
            String status) {
        Instant timestamp = Instant.now();
        this.id = id;
        this.tenantId = tenantId;
        this.channel = channel;
        this.eventType = eventType;
        this.title = title;
        this.body = body;
        this.status = status;
        this.createdAt = timestamp;
        this.updatedAt = timestamp;
    }

    void update(String channel, String eventType, String title, String body, String status) {
        this.channel = channel;
        this.eventType = eventType;
        this.title = title;
        this.body = body;
        this.status = status;
        this.updatedAt = Instant.now();
    }
}
