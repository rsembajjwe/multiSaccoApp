package com.methaltech.sacco.accounting;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "statement_lines")
class StatementLine {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "account_code")
    private String accountCode;

    private String channel;

    private BigDecimal amount;

    @Column(name = "external_reference")
    private String externalReference;

    private String description;

    @Column(name = "statement_date")
    private LocalDate statementDate;

    @Column(name = "imported_by_user_id")
    private String importedByUserId;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    protected StatementLine() {
    }

    StatementLine(
            String id,
            String tenantId,
            String accountCode,
            String channel,
            BigDecimal amount,
            String externalReference,
            String description,
            LocalDate statementDate,
            String importedByUserId) {
        this.id = id;
        this.tenantId = tenantId;
        this.accountCode = accountCode;
        this.channel = channel;
        this.amount = amount;
        this.externalReference = externalReference;
        this.description = description;
        this.statementDate = statementDate;
        this.importedByUserId = importedByUserId;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    String getId() {
        return id;
    }

    String getTenantId() {
        return tenantId;
    }

    String getAccountCode() {
        return accountCode;
    }

    String getChannel() {
        return channel;
    }

    BigDecimal getAmount() {
        return amount;
    }

    String getExternalReference() {
        return externalReference;
    }

    String getDescription() {
        return description;
    }

    LocalDate getStatementDate() {
        return statementDate;
    }

    String getImportedByUserId() {
        return importedByUserId;
    }

    Instant getCreatedAt() {
        return createdAt;
    }

    Instant getUpdatedAt() {
        return updatedAt;
    }
}
