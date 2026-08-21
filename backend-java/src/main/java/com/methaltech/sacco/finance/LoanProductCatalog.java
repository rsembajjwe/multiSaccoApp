package com.methaltech.sacco.finance;

import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Read-only, member-safe view over active loan products for a tenant.
 * Exposes only non-sensitive fields so the member portal can populate the
 * loan-application product dropdown without depending on finance-internal
 * entities or DTOs.
 */
@Service
public class LoanProductCatalog {

    private static final String LOAN_PRODUCT_TYPE = "loan";

    private final FinancialProductRepository repository;

    LoanProductCatalog(FinancialProductRepository repository) {
        this.repository = repository;
    }

    public List<LoanProductOption> activeLoanProducts(String tenantId) {
        if (tenantId == null || tenantId.isBlank()) {
            return List.of();
        }
        return repository.findByTenantIdAndProductTypeOrderByCodeAsc(tenantId, LOAN_PRODUCT_TYPE).stream()
                .filter(product -> product.getStatus() == null || "active".equalsIgnoreCase(product.getStatus()))
                .map(product -> new LoanProductOption(product.getId(), product.getCode(), product.getName()))
                .toList();
    }

    public record LoanProductOption(String id, String code, String name) {
    }
}
