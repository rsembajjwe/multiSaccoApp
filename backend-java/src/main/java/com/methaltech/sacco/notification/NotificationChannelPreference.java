package com.methaltech.sacco.notification;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * A notification channel toggle. When {@code memberId} is blank the row is a SACCO-wide channel toggle;
 * otherwise it is a per-member override. Absence of a row means the channel is enabled.
 */
@Entity
@Table(name = "notification_channel_preferences")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NotificationChannelPreference {

    static final String SACCO_LEVEL = "";

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "member_id")
    private String memberId;

    private String channel;

    private boolean enabled;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    NotificationChannelPreference(String id, String tenantId, String memberId, String channel, boolean enabled) {
        this.id = id;
        this.tenantId = tenantId;
        this.memberId = memberId == null ? SACCO_LEVEL : memberId;
        this.channel = channel;
        this.enabled = enabled;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    void setEnabled(boolean enabled) {
        this.enabled = enabled;
        this.updatedAt = Instant.now();
    }
}
