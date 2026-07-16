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
@Table(name = "expenses")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class Expense {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "supplier_id")
    private String supplierId;

    @Column(name = "account_code")
    private String accountCode;

    private BigDecimal amount;
    private String channel;
    private String reference;
    private String description;

    @Column(name = "expense_date")
    private LocalDate expenseDate;

    private String status;

    @Column(name = "recorded_by_user_id")
    private String recordedByUserId;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    Expense(
            String id,
            String tenantId,
            String supplierId,
            String accountCode,
            BigDecimal amount,
            String channel,
            String reference,
            String description,
            LocalDate expenseDate,
            String recordedByUserId) {
        this.id = id;
        this.tenantId = tenantId;
        this.supplierId = supplierId;
        this.accountCode = accountCode;
        this.amount = amount;
        this.channel = channel;
        this.reference = reference;
        this.description = description;
        this.expenseDate = expenseDate;
        this.status = "posted";
        this.recordedByUserId = recordedByUserId;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }
}
