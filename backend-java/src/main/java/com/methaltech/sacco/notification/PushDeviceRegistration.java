package com.methaltech.sacco.notification;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "push_device_registrations")
class PushDeviceRegistration {
    @Id
    private String id;
    @Column(name = "tenant_id", nullable = false)
    private String tenantId;
    @Column(name = "owner_type", nullable = false)
    private String ownerType;
    @Column(name = "owner_id", nullable = false)
    private String ownerId;
    @Column(name = "device_token", nullable = false, length = 512)
    private String deviceToken;
    @Column(nullable = false)
    private String platform;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected PushDeviceRegistration() {
    }

    PushDeviceRegistration(String id, String tenantId, String ownerType, String ownerId,
            String deviceToken, String platform) {
        this.id = id;
        this.tenantId = tenantId;
        this.ownerType = ownerType;
        this.ownerId = ownerId;
        this.deviceToken = deviceToken;
        this.platform = platform;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    void assignTo(String tenantId, String ownerType, String ownerId, String platform) {
        this.tenantId = tenantId;
        this.ownerType = ownerType;
        this.ownerId = ownerId;
        this.platform = platform;
        this.updatedAt = Instant.now();
    }

    String getDeviceToken() { return deviceToken; }
}
