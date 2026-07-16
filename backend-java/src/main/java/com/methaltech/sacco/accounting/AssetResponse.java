package com.methaltech.sacco.accounting;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

record AssetResponse(
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
        String status,
        String recordedByUserId,
        BigDecimal accumulatedDepreciation,
        BigDecimal netBookValue,
        Instant createdAt,
        Instant updatedAt) {

    static AssetResponse from(Asset asset, BigDecimal accumulatedDepreciation, BigDecimal netBookValue) {
        return new AssetResponse(
                asset.getId(),
                asset.getTenantId(),
                asset.getName(),
                asset.getCategory(),
                asset.getAssetAccountCode(),
                asset.getCost(),
                asset.getSalvageValue(),
                asset.getUsefulLifeMonths(),
                asset.getPurchaseDate(),
                asset.getDepreciationStartDate(),
                asset.getChannel(),
                asset.getReference(),
                asset.getLocation(),
                asset.getCustodianUserId(),
                asset.getStatus(),
                asset.getRecordedByUserId(),
                accumulatedDepreciation,
                netBookValue,
                asset.getCreatedAt(),
                asset.getUpdatedAt());
    }
}
