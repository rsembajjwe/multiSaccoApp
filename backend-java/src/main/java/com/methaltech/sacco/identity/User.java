package com.methaltech.sacco.identity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "users")
public class User {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "full_name")
    private String fullName;

    private String email;

    private String phone;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "password_salt")
    private String passwordSalt;

    private String status;

    @Column(name = "mfa_enabled")
    private boolean mfaEnabled;

    @Column(name = "password_reset_required")
    private boolean passwordResetRequired;

    @Column(name = "onboarding_channel")
    private String onboardingChannel;

    @Column(name = "onboarding_delivery_status")
    private String onboardingDeliveryStatus;

    @Column(name = "onboarding_sent_at")
    private Instant onboardingSentAt;

    @Column(name = "email_verified_at")
    private Instant emailVerifiedAt;

    @Column(name = "phone_verified_at")
    private Instant phoneVerifiedAt;

    @Column(name = "created_at")
    private Instant createdAt;

    protected User() {
    }

    User(
            String id,
            String tenantId,
            String fullName,
            String email,
            String phone,
            String passwordHash,
            String passwordSalt,
            String status) {
        this.id = id;
        this.tenantId = tenantId;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.passwordHash = passwordHash;
        this.passwordSalt = passwordSalt;
        this.status = status;
        this.mfaEnabled = false;
        this.passwordResetRequired = false;
        this.createdAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public String getTenantId() {
        return tenantId;
    }

    public String getFullName() {
        return fullName;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getPasswordSalt() {
        return passwordSalt;
    }

    public String getStatus() {
        return status;
    }

    public boolean isMfaEnabled() {
        return mfaEnabled;
    }

    public boolean isPasswordResetRequired() {
        return passwordResetRequired;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public String getOnboardingChannel() {
        return onboardingChannel;
    }

    public String getOnboardingDeliveryStatus() {
        return onboardingDeliveryStatus;
    }

    public boolean isEmailVerified() {
        return emailVerifiedAt != null;
    }

    public boolean isPhoneVerified() {
        return phoneVerifiedAt != null;
    }

    void changePassword(String passwordHash, String passwordSalt) {
        this.passwordHash = passwordHash;
        this.passwordSalt = passwordSalt;
        this.passwordResetRequired = false;
    }

    void requirePasswordReset() {
        this.passwordResetRequired = true;
    }

    void beginOnboarding(String channel) {
        this.onboardingChannel = channel;
        this.onboardingDeliveryStatus = "pending";
        this.passwordResetRequired = true;
    }

    void setTemporaryPassword(String passwordHash, String passwordSalt, String channel) {
        this.passwordHash = passwordHash;
        this.passwordSalt = passwordSalt;
        beginOnboarding(channel);
    }

    void markOnboardingSent() {
        this.onboardingDeliveryStatus = "sent";
        this.onboardingSentAt = Instant.now();
    }

    String onboardingRecipient() {
        return "sms".equals(onboardingChannel) ? phone : email;
    }

    void verifyOnboardingContact() {
        if ("sms".equals(onboardingChannel)) {
            this.phoneVerifiedAt = Instant.now();
        } else if ("email".equals(onboardingChannel)) {
            this.emailVerifiedAt = Instant.now();
        }
    }

    void updateProfile(String fullName, String email, String phone) {
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
    }

    void updateOwnContact(String email, String phone) {
        if (this.email == null || !this.email.equalsIgnoreCase(email)) {
            this.emailVerifiedAt = null;
        }
        if (this.phone == null || !this.phone.equals(phone)) {
            this.phoneVerifiedAt = null;
        }
        this.email = email;
        this.phone = phone;
    }

    void changeStatus(String status) {
        this.status = status;
    }

    void enableMfa() {
        this.mfaEnabled = true;
    }

    void disableMfa() {
        this.mfaEnabled = false;
    }
}
