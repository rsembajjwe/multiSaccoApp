package com.methaltech.sacco.member;

import com.methaltech.sacco.privacy.EncryptedNationalIdConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
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
    @Convert(converter = EncryptedNationalIdConverter.class)
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

    @Column(name = "privacy_notice_accepted_at")
    private Instant privacyNoticeAcceptedAt;

    @Column(name = "sms_consent")
    private boolean smsConsent;

    @Column(name = "email_consent")
    private boolean emailConsent;

    @Column(name = "mobile_money_consent")
    private boolean mobileMoneyConsent;

    @Column(name = "provider_data_sharing_consent")
    private boolean providerDataSharingConsent;

    @Column(name = "consent_updated_at")
    private Instant consentUpdatedAt;

    @Column(name = "guarantor_listing_opt_out")
    private boolean guarantorListingOptOut;

    /** Optional link to a staff user account when this member is also SACCO staff (conflict-of-interest control). */
    @Column(name = "linked_user_id")
    private String linkedUserId;

    @Column(name = "savings_balance")
    private BigDecimal savingsBalance;

    @Column(name = "shares_balance")
    private BigDecimal sharesBalance;

    @Column(name = "welfare_balance")
    private BigDecimal welfareBalance;

    /** Portion of savings pledged as collateral for a savings-secured loan; not withdrawable. */
    @Column(name = "savings_hold")
    private BigDecimal savingsHold = BigDecimal.ZERO;

    @Version
    @Column(name = "lock_version")
    private Long lockVersion;

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
        this.smsConsent = false;
        this.emailConsent = false;
        this.mobileMoneyConsent = false;
        this.providerDataSharingConsent = false;
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

    void updateConsents(
            boolean privacyNoticeAccepted,
            boolean smsConsent,
            boolean emailConsent,
            boolean mobileMoneyConsent,
            boolean providerDataSharingConsent) {
        Instant now = Instant.now();
        if (privacyNoticeAccepted && this.privacyNoticeAcceptedAt == null) {
            this.privacyNoticeAcceptedAt = now;
        }
        this.smsConsent = smsConsent;
        this.emailConsent = emailConsent;
        this.mobileMoneyConsent = mobileMoneyConsent;
        this.providerDataSharingConsent = providerDataSharingConsent;
        this.consentUpdatedAt = now;
        this.updatedAt = now;
    }

    void updateKycStatus(String kycStatus) {
        this.kycStatus = kycStatus;
        this.updatedAt = Instant.now();
    }

    void updateProfile(
            String branchId,
            String fullName,
            String memberType,
            String phone,
            String email,
            String nationalId,
            String status,
            String kycStatus,
            LocalDate joiningDate) {
        this.branchId = branchId;
        this.fullName = fullName;
        this.memberType = memberType;
        this.phone = phone;
        this.email = email;
        this.nationalId = nationalId;
        this.status = status;
        this.kycStatus = kycStatus;
        this.joiningDate = joiningDate;
        this.updatedAt = Instant.now();
    }

    /** Sets a new password hash/salt (used by the member self-service password reset). */
    public void changePassword(String passwordHash, String passwordSalt) {
        this.passwordHash = passwordHash;
        this.passwordSalt = passwordSalt;
        this.updatedAt = Instant.now();
    }

    public boolean isGuarantorListingOptOut() {
        return guarantorListingOptOut;
    }

    /** When true, the member is hidden from other members' guarantor search picker. */
    public void setGuarantorListingOptOut(boolean optOut) {
        this.guarantorListingOptOut = optOut;
        this.updatedAt = Instant.now();
    }

    public String getLinkedUserId() {
        return linkedUserId;
    }

    /** Link this member to a staff user account (they are the same person). */
    public void linkStaffUser(String userId) {
        this.linkedUserId = userId == null || userId.isBlank() ? null : userId.trim();
        this.updatedAt = Instant.now();
    }

    public void unlinkStaffUser() {
        this.linkedUserId = null;
        this.updatedAt = Instant.now();
    }

    void redactPersonalDataForErasure() {
        this.fullName = "Former member " + membershipNo;
        this.phone = "";
        this.email = "";
        this.nationalId = "";
        this.passwordHash = "";
        this.passwordSalt = "";
        this.status = "exited";
        this.kycStatus = "expired";
        this.smsConsent = false;
        this.emailConsent = false;
        this.mobileMoneyConsent = false;
        this.providerDataSharingConsent = false;
        this.consentUpdatedAt = Instant.now();
        this.updatedAt = this.consentUpdatedAt;
    }

    public void applyPostedTransaction(String type, BigDecimal amount) {
        requirePositiveAmount(amount);
        if ("savings_deposit".equals(type)) this.savingsBalance = this.savingsBalance.add(amount);
        if ("withdrawal".equals(type)) this.savingsBalance = subtractAvailableBalance(this.savingsBalance, amount, "Savings");
        if ("share_purchase".equals(type)) this.sharesBalance = this.sharesBalance.add(amount);
        if ("welfare_contribution".equals(type)) this.welfareBalance = this.welfareBalance.add(amount);
        this.updatedAt = Instant.now();
    }

    public void applyReversal(String type, BigDecimal amount) {
        requirePositiveAmount(amount);
        if ("savings_deposit".equals(type)) this.savingsBalance = subtractAvailableBalance(this.savingsBalance, amount, "Savings");
        if ("withdrawal".equals(type)) this.savingsBalance = this.savingsBalance.add(amount);
        if ("share_purchase".equals(type)) this.sharesBalance = subtractAvailableBalance(this.sharesBalance, amount, "Shares");
        if ("welfare_contribution".equals(type)) this.welfareBalance = subtractAvailableBalance(this.welfareBalance, amount, "Welfare");
        this.updatedAt = Instant.now();
    }

    public BigDecimal getSavingsHold() {
        return savingsHold == null ? BigDecimal.ZERO : savingsHold;
    }

    /** Savings the member can actually withdraw or transfer, i.e. balance minus any collateral hold. */
    public BigDecimal getAvailableSavings() {
        return savingsBalance.subtract(getSavingsHold()).max(BigDecimal.ZERO);
    }

    public void placeSavingsHold(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) return;
        this.savingsHold = getSavingsHold().add(amount);
        this.updatedAt = Instant.now();
    }

    public void releaseSavingsHold(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) return;
        this.savingsHold = getSavingsHold().subtract(amount).max(BigDecimal.ZERO);
        this.updatedAt = Instant.now();
    }

    public boolean hasEnoughSavings(BigDecimal amount) {
        return getAvailableSavings().compareTo(amount) >= 0;
    }

    public boolean hasEnoughWelfare(BigDecimal amount) {
        return welfareBalance.compareTo(amount) >= 0;
    }

    public void applyWelfareClaimPayment(BigDecimal amount) {
        requirePositiveAmount(amount);
        this.welfareBalance = subtractAvailableBalance(this.welfareBalance, amount, "Welfare");
        this.updatedAt = Instant.now();
    }

    public boolean canReverse(String type, BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) return false;
        if ("savings_deposit".equals(type)) return savingsBalance.compareTo(amount) >= 0;
        if ("share_purchase".equals(type)) return sharesBalance.compareTo(amount) >= 0;
        if ("welfare_contribution".equals(type)) return welfareBalance.compareTo(amount) >= 0;
        return true;
    }

    private static void requirePositiveAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Transaction amount must be greater than zero.");
        }
    }

    private static BigDecimal subtractAvailableBalance(BigDecimal current, BigDecimal amount, String balanceName) {
        BigDecimal next = current.subtract(amount);
        if (next.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalStateException(balanceName + " balance cannot go below zero.");
        }
        return next;
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

    Instant getPrivacyNoticeAcceptedAt() {
        return privacyNoticeAcceptedAt;
    }

    boolean isSmsConsent() {
        return smsConsent;
    }

    boolean isEmailConsent() {
        return emailConsent;
    }

    boolean isMobileMoneyConsent() {
        return mobileMoneyConsent;
    }

    boolean isProviderDataSharingConsent() {
        return providerDataSharingConsent;
    }

    Instant getConsentUpdatedAt() {
        return consentUpdatedAt;
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
