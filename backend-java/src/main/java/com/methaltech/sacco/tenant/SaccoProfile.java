package com.methaltech.sacco.tenant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
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
}
