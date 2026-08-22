package com.methaltech.sacco.tenant;

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
@Table(name = "sacco_profiles")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class SaccoProfile {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "legal_name")
    private String legalName;

    private String tin;

    @Column(name = "umra_license_no")
    private String umraLicenseNo;

    @Column(name = "cooperative_registration_no")
    private String cooperativeRegistrationNo;

    private String address;
    private String email;
    private String phone;
    private String website;

    @Column(name = "membership_dues_period")
    private String membershipDuesPeriod;

    @Column(name = "membership_calendar_start_month")
    private Integer membershipCalendarStartMonth;

    @Column(name = "membership_calendar_start_day")
    private Integer membershipCalendarStartDay;

    @Column(name = "membership_subscription_amount")
    private BigDecimal membershipSubscriptionAmount;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    SaccoProfile(
            String id,
            String tenantId,
            String legalName,
            String tin,
            String umraLicenseNo,
            String cooperativeRegistrationNo,
            String address,
            String email,
            String phone,
            String website) {
        this.id = id;
        this.tenantId = tenantId;
        this.legalName = legalName;
        this.tin = tin;
        this.umraLicenseNo = umraLicenseNo;
        this.cooperativeRegistrationNo = cooperativeRegistrationNo;
        this.address = address;
        this.email = email;
        this.phone = phone;
        this.website = website;
        this.membershipDuesPeriod = "annual";
        this.membershipCalendarStartMonth = 1;
        this.membershipCalendarStartDay = 1;
        this.membershipSubscriptionAmount = BigDecimal.valueOf(5000);
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    void update(
            String legalName,
            String tin,
            String umraLicenseNo,
            String cooperativeRegistrationNo,
            String address,
            String email,
            String phone,
            String website) {
        this.legalName = legalName;
        this.tin = tin;
        this.umraLicenseNo = umraLicenseNo;
        this.cooperativeRegistrationNo = cooperativeRegistrationNo;
        this.address = address;
        this.email = email;
        this.phone = phone;
        this.website = website;
        this.updatedAt = Instant.now();
    }

    void updateMembershipCalendar(String period, Integer startMonth, Integer startDay, BigDecimal amount) {
        this.membershipDuesPeriod = period;
        this.membershipCalendarStartMonth = startMonth;
        this.membershipCalendarStartDay = startDay;
        this.membershipSubscriptionAmount = amount == null || amount.signum() <= 0 ? BigDecimal.valueOf(5000) : amount;
        this.updatedAt = Instant.now();
    }
}
