package com.methaltech.sacco.tenant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

@Entity
@Table(
        name = "sacco_official_assignments",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_sacco_official_office", columnNames = {"tenant_id", "office"}),
                @UniqueConstraint(name = "uk_sacco_official_member", columnNames = {"tenant_id", "member_id"})
        })
public class SaccoOfficialAssignment {

    public static final String CHAIRPERSON = "chairperson";
    public static final String SECRETARY = "secretary";
    public static final String TREASURER = "treasurer";

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    private String office;

    @Column(name = "member_id")
    private String memberId;

    @Column(name = "assigned_by_user_id")
    private String assignedByUserId;

    @Column(name = "assigned_at")
    private Instant assignedAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    protected SaccoOfficialAssignment() {
    }

    public SaccoOfficialAssignment(String id, String tenantId, String office, String memberId, String assignedByUserId) {
        this.id = id;
        this.tenantId = tenantId;
        this.office = office;
        this.memberId = memberId;
        this.assignedByUserId = assignedByUserId;
        this.assignedAt = Instant.now();
        this.updatedAt = this.assignedAt;
    }

    public void transferTo(String memberId, String assignedByUserId) {
        this.memberId = memberId;
        this.assignedByUserId = assignedByUserId;
        this.updatedAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public String getTenantId() {
        return tenantId;
    }

    public String getOffice() {
        return office;
    }

    public String getMemberId() {
        return memberId;
    }

    public String getAssignedByUserId() {
        return assignedByUserId;
    }

    public Instant getAssignedAt() {
        return assignedAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}