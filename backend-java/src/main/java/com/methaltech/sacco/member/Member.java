package com.methaltech.sacco.member;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "members")
class Member {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "branch_id")
    private String branchId;

    @Column(name = "membership_no")
    private String membershipNo;

    @Column(name = "full_name")
    private String fullName;

    @Column(name = "member_type")
    private String memberType;

    private String phone;

    private String email;

    @Column(name = "national_id")
    private String nationalId;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "password_salt")
    private String passwordSalt;

    private String status;

    @Column(name = "kyc_status")
    private String kycStatus;

    @Column(name = "joining_date")
    private LocalDate joiningDate;

    @Column(name = "savings_balance")
    private BigDecimal savingsBalance;

    @Column(name = "shares_balance")
    private BigDecimal sharesBalance;

    @Column(name = "welfare_balance")
    private BigDecimal welfareBalance;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    protected Member() {
    }

    Member(
            String id,
            String tenantId,
            String branchId,
            String membershipNo,
            String fullName,
            String memberType,
            String phone,
            String email,
            String nationalId,
            String passwordHash,
            String passwordSalt,
            String status,
            String kycStatus,
            LocalDate joiningDate) {
        this.id = id;
        this.tenantId = tenantId;
        this.branchId = branchId;
        this.membershipNo = membershipNo;
        this.fullName = fullName;
        this.memberType = memberType;
        this.phone = phone;
        this.email = email;
        this.nationalId = nationalId;
        this.passwordHash = passwordHash;
        this.passwordSalt = passwordSalt;
        this.status = status;
        this.kycStatus = kycStatus;
        this.joiningDate = joiningDate;
        this.savingsBalance = BigDecimal.ZERO;
        this.sharesBalance = BigDecimal.ZERO;
        this.welfareBalance = BigDecimal.ZERO;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    void updateStatus(String status) {
        this.status = status;
        this.updatedAt = Instant.now();
    }

    String getId() {
        return id;
    }

    String getTenantId() {
        return tenantId;
    }

    String getBranchId() {
        return branchId;
    }

    String getMembershipNo() {
        return membershipNo;
    }

    String getFullName() {
        return fullName;
    }

    String getMemberType() {
        return memberType;
    }

    String getPhone() {
        return phone;
    }

    String getEmail() {
        return email;
    }

    String getNationalId() {
        return nationalId;
    }

    String getStatus() {
        return status;
    }

    String getKycStatus() {
        return kycStatus;
    }

    LocalDate getJoiningDate() {
        return joiningDate;
    }

    BigDecimal getSavingsBalance() {
        return savingsBalance;
    }

    BigDecimal getSharesBalance() {
        return sharesBalance;
    }

    BigDecimal getWelfareBalance() {
        return welfareBalance;
    }

    Instant getCreatedAt() {
        return createdAt;
    }

    Instant getUpdatedAt() {
        return updatedAt;
    }
}
