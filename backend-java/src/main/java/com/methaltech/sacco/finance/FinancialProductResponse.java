package com.methaltech.sacco.finance;

import java.math.BigDecimal;
import java.time.Instant;
import lombok.Builder;

@Builder
record FinancialProductResponse(
        String id,
        String tenantId,
        String productType,
        String code,
        String name,
        BigDecimal contributionAmount,
        BigDecimal minimumBalance,
        BigDecimal interestRate,
        String status,
        String createdByUserId,
        Instant createdAt,
        Instant updatedAt) {

    static FinancialProductResponse from(FinancialProduct product) {
        return FinancialProductResponse.builder()
                .id(product.getId())
                .tenantId(product.getTenantId())
                .productType(product.getProductType())
                .code(product.getCode())
                .name(product.getName())
                .contributionAmount(product.getContributionAmount())
                .minimumBalance(product.getMinimumBalance())
                .interestRate(product.getInterestRate())
                .status(product.getStatus())
                .createdByUserId(product.getCreatedByUserId())
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .build();
    }
}
