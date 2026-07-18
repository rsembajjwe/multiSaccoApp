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
public class Member {

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

    void updateKycStatus(String kycStatus) {
        this.kycStatus = kycStatus;
        this.updatedAt = Instant.now();
    }

    public void applyPostedTransaction(String type, BigDecimal amount) {
        if ("savings_deposit".equals(type)) this.savingsBalance = this.savingsBalance.add(amount);
        if ("withdrawal".equals(type)) this.savingsBalance = this.savingsBalance.subtract(amount);
        if ("share_purchase".equals(type)) this.sharesBalance = this.sharesBalance.add(amount);
        if ("welfare_contribution".equals(type)) this.welfareBalance = this.welfareBalance.add(amount);
        this.updatedAt = Instant.now();
    }

    public void applyReversal(String type, BigDecimal amount) {
        if ("savings_deposit".equals(type)) this.savingsBalance = this.savingsBalance.subtract(amount);
        if ("withdrawal".equals(type)) this.savingsBalance = this.savingsBalance.add(amount);
        if ("share_purchase".equals(type)) this.sharesBalance = this.sharesBalance.subtract(amount);
        if ("welfare_contribution".equals(type)) this.welfareBalance = this.welfareBalance.subtract(amount);
        this.updatedAt = Instant.now();
    }

    public boolean hasEnoughSavings(BigDecimal amount) {
        return savingsBalance.compareTo(amount) >= 0;
    }

    public boolean hasEnoughWelfare(BigDecimal amount) {
        return welfareBalance.compareTo(amount) >= 0;
    }

    public void applyWelfareClaimPayment(BigDecimal amount) {
        this.welfareBalance = this.welfareBalance.subtract(amount);
        this.updatedAt = Instant.now();
    }

    public boolean canReverse(String type, BigDecimal amount) {
        if ("savings_deposit".equals(type)) return savingsBalance.compareTo(amount) >= 0;
        if ("share_purchase".equals(type)) return sharesBalance.compareTo(amount) >= 0;
        if ("welfare_contribution".equals(type)) return welfareBalance.compareTo(amount) >= 0;
        return true;
    }

    public String getId() {
        return id;
    }

    public String getTenantId() {
        return tenantId;
    }

    public String getBranchId() {
        return branchId;
    }

    public String getMembershipNo() {
        return membershipNo;
    }

    public String getFullName() {
        return fullName;
    }

    String getMemberType() {
        return memberType;
    }

    public String getPhone() {
        return phone;
    }

    public String getEmail() {
        return email;
    }

    String getNationalId() {
        return nationalId;
    }

    String getPasswordHash() {
        return passwordHash;
    }

    String getPasswordSalt() {
        return passwordSalt;
    }

    public String getStatus() {
        return status;
    }

    String getKycStatus() {
        return kycStatus;
    }

    LocalDate getJoiningDate() {
        return joiningDate;
    }

    public BigDecimal getSavingsBalance() {
        return savingsBalance;
    }

    public BigDecimal getSharesBalance() {
        return sharesBalance;
    }

    public BigDecimal getWelfareBalance() {
        return welfareBalance;
    }

    Instant getCreatedAt() {
        return createdAt;
    }

    Instant getUpdatedAt() {
        return updatedAt;
    }
}
