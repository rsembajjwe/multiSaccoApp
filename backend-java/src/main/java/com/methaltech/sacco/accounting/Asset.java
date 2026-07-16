package com.methaltech.sacco.accounting;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "assets")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class Asset {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    private String name;
    private String category;

    @Column(name = "asset_account_code")
    private String assetAccountCode;

    private BigDecimal cost;

    @Column(name = "salvage_value")
    private BigDecimal salvageValue;

    @Column(name = "useful_life_months")
    private int usefulLifeMonths;

    @Column(name = "purchase_date")
    private LocalDate purchaseDate;

    @Column(name = "depreciation_start_date")
    private LocalDate depreciationStartDate;

    private String channel;
    private String reference;
    private String location;

    @Column(name = "custodian_user_id")
    private String custodianUserId;

    private String status;

    @Column(name = "recorded_by_user_id")
    private String recordedByUserId;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    Asset(
            String id,
            String tenantId,
            String name,
            String category,
            String assetAccountCode,
            BigDecimal cost,
            BigDecimal salvageValue,
            int usefulLifeMonths,
            LocalDate purchaseDate,
            LocalDate depreciationStartDate,
            String channel,
            String reference,
            String location,
            String custodianUserId,
            String recordedByUserId) {
        this.id = id;
        this.tenantId = tenantId;
        this.name = name;
        this.category = category;
        this.assetAccountCode = assetAccountCode;
        this.cost = cost;
        this.salvageValue = salvageValue;
        this.usefulLifeMonths = usefulLifeMonths;
        this.purchaseDate = purchaseDate;
        this.depreciationStartDate = depreciationStartDate;
        this.channel = channel;
        this.reference = reference;
        this.location = location;
        this.custodianUserId = custodianUserId;
        this.status = "active";
        this.recordedByUserId = recordedByUserId;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }
}
