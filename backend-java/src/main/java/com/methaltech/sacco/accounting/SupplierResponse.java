package com.methaltech.sacco.accounting;

import java.time.Instant;

record SupplierResponse(
        String id,
        String tenantId,
        String name,
        String phone,
        String email,
        String taxId,
        String status,
        String createdByUserId,
        Instant createdAt,
        Instant updatedAt) {

    static SupplierResponse from(Supplier supplier) {
        return new SupplierResponse(
                supplier.getId(),
                supplier.getTenantId(),
                supplier.getName(),
                supplier.getPhone(),
                supplier.getEmail(),
                supplier.getTaxId(),
                supplier.getStatus(),
                supplier.getCreatedByUserId(),
                supplier.getCreatedAt(),
                supplier.getUpdatedAt());
    }
}
