package com.methaltech.sacco.identity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "roles")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class Role {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    private String name;

    @Column(name = "protected_role")
    private boolean protectedRole;

    @Column(name = "created_by_user_id")
    private String createdByUserId;

    @Column(name = "created_at")
    private Instant createdAt;

    Role(String id, String tenantId, String name, boolean protectedRole, String createdByUserId) {
        this.id = id;
        this.tenantId = tenantId;
        this.name = name;
        this.protectedRole = protectedRole;
        this.createdByUserId = createdByUserId;
        this.createdAt = Instant.now();
    }
}
