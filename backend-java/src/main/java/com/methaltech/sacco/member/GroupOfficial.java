package com.methaltech.sacco.member;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "group_officials")
class GroupOfficial {

    @Id
    private String id;

    @Column(name = "tenant_id", nullable = false)
    private String tenantId;

    @Column(name = "member_id", nullable = false)
    private String memberId;

    @Column(nullable = false)
    private String role;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(nullable = false)
    private String phone;

    @Column(nullable = false)
    private String email;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected GroupOfficial() {
    }

    GroupOfficial(
            String id,
            String tenantId,
            String memberId,
            String role,
            String fullName,
            String phone,
            String email) {
        this.id = id;
        this.tenantId = tenantId;
        this.memberId = memberId;
        this.role = role;
        this.fullName = fullName;
        this.phone = phone;
        this.email = email;
        this.createdAt = Instant.now();
    }

    String getId() { return id; }
    String getTenantId() { return tenantId; }
    String getMemberId() { return memberId; }
    String getRole() { return role; }
    String getFullName() { return fullName; }
    String getPhone() { return phone; }
    String getEmail() { return email; }
}
