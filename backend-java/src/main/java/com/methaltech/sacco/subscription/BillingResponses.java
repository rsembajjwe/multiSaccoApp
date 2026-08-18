package com.methaltech.sacco.subscription;

import java.math.BigDecimal;
import java.util.List;

/** Response DTOs for the platform add-on billing avenues. */
final class BillingResponses {

    private BillingResponses() {
    }

    record BillingCatalogResponse(
            String code,
            String name,
            String category,
            BigDecimal unitPrice,
            String billingPeriod,
            boolean active) {

        static BillingCatalogResponse from(BillingCatalogItem item) {
            return new BillingCatalogResponse(
                    item.getCode(), item.getName(), item.getCategory(),
                    item.getUnitPrice(), item.getBillingPeriod(), item.isActive());
        }
    }

    record TenantBillingItemResponse(
            String id,
            String tenantId,
            String catalogCode,
            String name,
            String category,
            int quantity,
            BigDecimal unitPrice,
            BigDecimal amount,
            String billingPeriod,
            String status) {
    }

    /** One line on the composed invoice. */
    record BillingLine(
            String category,
            String description,
            int quantity,
            BigDecimal unitPrice,
            BigDecimal amount,
            String billingPeriod) {
    }

    /** The full per-SACCO revenue breakdown: base subscription + all add-on avenues. */
    record BillingSummaryResponse(
            String tenantId,
            BigDecimal baseSubscription,
            List<BillingLine> lines,
            BigDecimal annualRecurringTotal,
            BigDecimal oneTimeTotal,
            BigDecimal usageTotal,
            BigDecimal total) {
    }
}
