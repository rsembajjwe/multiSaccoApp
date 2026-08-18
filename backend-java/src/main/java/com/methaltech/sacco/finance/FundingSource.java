package com.methaltech.sacco.finance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Set;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * A single entry in the SACCO sources-of-funds register: where a tranche of the SACCO's capital came
 * from. Allowed {@code sourceType}/{@code status} values are enforced here (not via DB CHECK constraints)
 * for H2/PostgreSQL parity.
 */
@Entity
@Table(name = "sacco_funding_sources")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class FundingSource {

    static final Set<String> SOURCE_TYPES = Set.of(
            "share_capital", "member_savings", "grant", "donation",
            "external_borrowing", "retained_earnings", "investment_income", "other");
    static final String STATUS_ACTIVE = "active";
    static final String STATUS_CLOSED = "closed";
    static final Set<String> STATUSES = Set.of(STATUS_ACTIVE, STATUS_CLOSED);

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "source_type")
    private String sourceType;

    private String provider;

    private BigDecimal amount;

    @Column(name = "currency_code")
    private String currencyCode;

    private String reference;

    @Column(name = "date_received")
    private LocalDate dateReceived;

    private String status;

    private String notes;

    @Column(name = "recorded_by_user_id")
    private String recordedByUserId;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    FundingSource(
            String id,
            String tenantId,
            String sourceType,
            String provider,
            BigDecimal amount,
            String currencyCode,
            String reference,
            LocalDate dateReceived,
            String status,
            String notes,
            String recordedByUserId) {
        this.id = id;
        this.tenantId = tenantId;
        this.sourceType = sourceType;
        this.provider = provider;
        this.amount = amount;
        this.currencyCode = currencyCode;
        this.reference = reference;
        this.dateReceived = dateReceived;
        this.status = status;
        this.notes = notes;
        this.recordedByUserId = recordedByUserId;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    /** Apply an edit from the register. All fields except identity/ownership are mutable. */
    void update(
            String sourceType,
            String provider,
            BigDecimal amount,
            String currencyCode,
            String reference,
            LocalDate dateReceived,
            String status,
            String notes) {
        this.sourceType = sourceType;
        this.provider = provider;
        this.amount = amount;
        this.currencyCode = currencyCode;
        this.reference = reference;
        this.dateReceived = dateReceived;
        this.status = status;
        this.notes = notes;
        this.updatedAt = Instant.now();
    }
}
