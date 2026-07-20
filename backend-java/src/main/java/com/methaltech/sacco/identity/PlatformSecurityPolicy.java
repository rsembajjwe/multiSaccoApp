package com.methaltech.sacco.identity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "platform_security_policies")
public class PlatformSecurityPolicy {

    @Id
    private String id;

    @Column(name = "minimum_password_length")
    private int minimumPasswordLength;

    @Column(name = "require_uppercase")
    private boolean requireUppercase;

    @Column(name = "require_lowercase")
    private boolean requireLowercase;

    @Column(name = "require_number")
    private boolean requireNumber;

    @Column(name = "require_symbol")
    private boolean requireSymbol;

    @Column(name = "password_expiry_days")
    private int passwordExpiryDays;

    @Column(name = "lockout_failed_attempts")
    private int lockoutFailedAttempts;

    @Column(name = "lockout_minutes")
    private int lockoutMinutes;

    @Column(name = "updated_at")
    private Instant updatedAt;

    protected PlatformSecurityPolicy() {
    }

    PlatformSecurityPolicy(
            String id,
            int minimumPasswordLength,
            boolean requireUppercase,
            boolean requireLowercase,
            boolean requireNumber,
            boolean requireSymbol,
            int passwordExpiryDays,
            int lockoutFailedAttempts,
            int lockoutMinutes) {
        this.id = id;
        update(minimumPasswordLength, requireUppercase, requireLowercase, requireNumber, requireSymbol, passwordExpiryDays, lockoutFailedAttempts, lockoutMinutes);
    }

    public String getId() {
        return id;
    }

    public int getMinimumPasswordLength() {
        return minimumPasswordLength;
    }

    public boolean isRequireUppercase() {
        return requireUppercase;
    }

    public boolean isRequireLowercase() {
        return requireLowercase;
    }

    public boolean isRequireNumber() {
        return requireNumber;
    }

    public boolean isRequireSymbol() {
        return requireSymbol;
    }

    public int getPasswordExpiryDays() {
        return passwordExpiryDays;
    }

    public int getLockoutFailedAttempts() {
        return lockoutFailedAttempts;
    }

    public int getLockoutMinutes() {
        return lockoutMinutes;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    void update(
            int minimumPasswordLength,
            boolean requireUppercase,
            boolean requireLowercase,
            boolean requireNumber,
            boolean requireSymbol,
            int passwordExpiryDays,
            int lockoutFailedAttempts,
            int lockoutMinutes) {
        this.minimumPasswordLength = minimumPasswordLength;
        this.requireUppercase = requireUppercase;
        this.requireLowercase = requireLowercase;
        this.requireNumber = requireNumber;
        this.requireSymbol = requireSymbol;
        this.passwordExpiryDays = passwordExpiryDays;
        this.lockoutFailedAttempts = lockoutFailedAttempts;
        this.lockoutMinutes = lockoutMinutes;
        this.updatedAt = Instant.now();
    }
}
