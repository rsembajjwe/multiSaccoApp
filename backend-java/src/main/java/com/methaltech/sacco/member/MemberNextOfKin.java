package com.methaltech.sacco.member;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "member_next_of_kin")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class MemberNextOfKin {

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

    private String address;

    @Column(name = "primary_contact")
    private boolean primaryContact;

    @Column(name = "created_by_user_id")
    private String createdByUserId;

    @Column(name = "created_at")
    private Instant createdAt;

    MemberNextOfKin(
            String id,
            String tenantId,
            String memberId,
            String fullName,
            String relationship,
            String phone,
            String address,
            boolean primaryContact,
            String createdByUserId) {
        this.id = id;
        this.tenantId = tenantId;
        this.memberId = memberId;
        this.fullName = fullName;
        this.relationship = relationship;
        this.phone = phone;
        this.address = address;
        this.primaryContact = primaryContact;
        this.createdByUserId = createdByUserId;
        this.createdAt = Instant.now();
    }
}
