package com.methaltech.sacco.member;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "member_beneficiaries")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class MemberBeneficiary {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "member_id")
    private String memberId;

    @Column(name = "full_name")
    private String fullName;

    private String relationship;

    private String phone;

    @Column(name = "allocation_percent")
    private BigDecimal allocationPercent;

    @Column(name = "created_by_user_id")
    private String createdByUserId;

    @Column(name = "created_at")
    private Instant createdAt;

    MemberBeneficiary(
            String id,
            String tenantId,
            String memberId,
            String fullName,
            String relationship,
            String phone,
            BigDecimal allocationPercent,
            String createdByUserId) {
        this.id = id;
        this.tenantId = tenantId;
        this.memberId = memberId;
        this.fullName = fullName;
        this.relationship = relationship;
        this.phone = phone;
        this.allocationPercent = allocationPercent;
        this.createdByUserId = createdByUserId;
        this.createdAt = Instant.now();
    }
}
