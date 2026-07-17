package com.methaltech.sacco.finance;

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
@Table(name = "financial_products")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class FinancialProduct {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "product_type")
    private String productType;

    private String code;
    private String name;

    @Column(name = "contribution_amount")
    private BigDecimal contributionAmount;

    @Column(name = "minimum_balance")
    private BigDecimal minimumBalance;

    @Column(name = "interest_rate")
    private BigDecimal interestRate;

    private String status;

    @Column(name = "created_by_user_id")
    private String createdByUserId;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    FinancialProduct(
            String id,
            String tenantId,
            String productType,
            String code,
            String name,
            BigDecimal contributionAmount,
            BigDecimal minimumBalance,
            BigDecimal interestRate,
            String createdByUserId) {
        this.id = id;
        this.tenantId = tenantId;
        this.productType = productType;
        this.code = code;
        this.name = name;
        this.contributionAmount = contributionAmount;
        this.minimumBalance = minimumBalance;
        this.interestRate = interestRate;
        this.status = "active";
        this.createdByUserId = createdByUserId;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }
}
