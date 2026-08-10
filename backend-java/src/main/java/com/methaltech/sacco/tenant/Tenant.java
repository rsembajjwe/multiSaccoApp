package com.methaltech.sacco.tenant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "tenants")
public class Tenant {

    @Id
    private String id;

    private String name;

    private String abbreviation;

    private String status;

    @Column(name = "registration_no")
    private String registrationNo;

    private String district;

    private String country;

    @Column(name = "locale_code")
    private String localeCode;

    @Column(name = "currency_code")
    private String currencyCode;

    @Column(name = "currency_digits")
    private int currencyDigits;

    @Column(name = "license_expiry")
    private LocalDate licenseExpiry;

    @Column(name = "package_id")
    private String packageId;

    @Column(name = "onboarding_percent")
    private int onboarding;

    // Platform-controlled: which collection channels this SACCO is allowed to use.
    @Column(name = "allowed_collection_mode")
    private String allowedCollectionMode;

    // SACCO-admin-controlled: which allowed channels the SACCO has activated.
    @Column(name = "mobile_money_collection_active")
    private boolean mobileMoneyCollectionActive;

    @Column(name = "bank_collection_active")
    private boolean bankCollectionActive;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    protected Tenant() {
    }

    Tenant(
            String id,
            String name,
            String abbreviation,
            String registrationNo,
            String district,
            LocalDate licenseExpiry,
            String packageId) {
        this(id, name, abbreviation, registrationNo, district, "Uganda", "en-UG", "UGX", 0, licenseExpiry, packageId);
    }

    Tenant(
            String id,
            String name,
            String abbreviation,
            String registrationNo,
            String district,
            String country,
            String localeCode,
            String currencyCode,
            int currencyDigits,
            LocalDate licenseExpiry,
            String packageId) {
        this.id = id;
        this.name = name;
        this.abbreviation = abbreviation;
        this.status = "pending_review";
        this.registrationNo = registrationNo;
        this.district = district;
        this.country = country;
        this.localeCode = localeCode;
        this.currencyCode = currencyCode;
        this.currencyDigits = currencyDigits;
        this.licenseExpiry = licenseExpiry;
        this.packageId = packageId;
        this.onboarding = 0;
        // New SACCOs start with no online collection until the platform enables it.
        this.allowedCollectionMode = CollectionMode.NONE.name();
        this.mobileMoneyCollectionActive = false;
        this.bankCollectionActive = false;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public void updateStatus(String status) {
        this.status = status;
        this.updatedAt = Instant.now();
    }

    /** Platform Super Admin sets the allowed collection mode. Any channel no longer allowed is deactivated. */
    public void updateAllowedCollectionMode(CollectionMode mode) {
        this.allowedCollectionMode = mode.name();
        if (!mode.allowsMobileMoney()) {
            this.mobileMoneyCollectionActive = false;
        }
        if (!mode.allowsBank()) {
            this.bankCollectionActive = false;
        }
        this.updatedAt = Instant.now();
    }

    /** SACCO admin activates channels. Caller must have validated these against the allowed mode. */
    public void updateCollectionActivation(boolean mobileMoneyActive, boolean bankActive) {
        this.mobileMoneyCollectionActive = mobileMoneyActive;
        this.bankCollectionActive = bankActive;
        this.updatedAt = Instant.now();
    }

    public CollectionMode getAllowedCollectionMode() {
        return CollectionMode.fromStored(allowedCollectionMode);
    }

    public boolean isMobileMoneyCollectionActive() {
        return mobileMoneyCollectionActive;
    }

    public boolean isBankCollectionActive() {
        return bankCollectionActive;
    }

    /** Effective member-facing availability: allowed by platform AND activated by the SACCO. */
    public boolean mobileMoneyCollectionAvailable() {
        return getAllowedCollectionMode().allowsMobileMoney() && mobileMoneyCollectionActive;
    }

    public boolean bankCollectionAvailable() {
        return getAllowedCollectionMode().allowsBank() && bankCollectionActive;
    }

    public void activate() {
        updateStatus("active");
    }

    public String getId() {
        return id;
    }

    String getName() {
        return name;
    }

    String getAbbreviation() {
        return abbreviation;
    }

    public String getStatus() {
        return status;
    }

    String getRegistrationNo() {
        return registrationNo;
    }

    String getDistrict() {
        return district;
    }

    String getCountry() {
        return country;
    }

    String getLocaleCode() {
        return localeCode;
    }

    String getCurrencyCode() {
        return currencyCode;
    }

    int getCurrencyDigits() {
        return currencyDigits;
    }

    LocalDate getLicenseExpiry() {
        return licenseExpiry;
    }

    String getPackageId() {
        return packageId;
    }

    int getOnboarding() {
        return onboarding;
    }

    Instant getCreatedAt() {
        return createdAt;
    }

    Instant getUpdatedAt() {
        return updatedAt;
    }
}
