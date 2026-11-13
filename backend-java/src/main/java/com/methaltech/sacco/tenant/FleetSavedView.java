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
@Table(name = "fleet_saved_views")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class FleetSavedView {
    @Id
    private String id;
    @Column(name = "user_id", nullable = false)
    private String userId;
    @Column(nullable = false)
    private String name;
    @Column(name = "search_text")
    private String search;
    private String health;
    @Column(name = "lifecycle_status")
    private String status;
    private String district;
    @Column(name = "account_manager")
    private String accountManager;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    FleetSavedView(String id, String userId, String name, String search, String health,
            String status, String district, String accountManager) {
        this.id = id;
        this.userId = userId;
        this.name = name;
        this.search = clean(search);
        this.health = clean(health);
        this.status = clean(status);
        this.district = clean(district);
        this.accountManager = clean(accountManager);
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    private String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
