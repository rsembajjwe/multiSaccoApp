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
@Table(name = "notification_deliveries")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class NotificationDelivery {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "notification_id")
    private String notificationId;

    @Column(name = "member_id")
    private String memberId;

    private String channel;
    private String provider;
    private String recipient;
    private String status;
    private String message;

    @Column(name = "sent_at")
    private Instant sentAt;

    @Column(name = "created_at")
    private Instant createdAt;

    NotificationDelivery(
            String id,
            String tenantId,
            String notificationId,
            String memberId,
            String channel,
            String provider,
            String recipient,
            String message) {
        this.id = id;
        this.tenantId = tenantId;
        this.notificationId = notificationId;
        this.memberId = memberId;
        this.channel = channel;
        this.provider = provider;
        this.recipient = recipient;
        this.status = "sent";
        this.message = message;
        this.sentAt = Instant.now();
        this.createdAt = this.sentAt;
    }
}
