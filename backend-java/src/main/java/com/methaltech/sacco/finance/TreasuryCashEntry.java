package com.methaltech.sacco.finance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.Set;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * One line in the Treasurer's cash book. A bank withdrawal brings cash IN
 * (bank -> cash on hand); every use pays cash OUT (loan disbursement, expense,
 * member payout, ...). The running balance of these lines is cash on hand.
 * Allowed direction/purpose values are enforced here, not with DB CHECK
 * constraints, for H2/PostgreSQL parity.
 */
@Entity
@Table(name = "treasury_cash_entries")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class TreasuryCashEntry {

    static final String IN = "in";
    static final String OUT = "out";
    static final Set<String> DIRECTIONS = Set.of(IN, OUT);

    /** purpose -> true when it brings cash into the Treasurer's hand, false when it pays out. */
    static final Map<String, Boolean> PURPOSES = Map.of(
            "bank_withdrawal", Boolean.TRUE,
            "loan_disbursement", Boolean.FALSE,
            "expense", Boolean.FALSE,
            "member_payout", Boolean.FALSE,
            "other", Boolean.FALSE);

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    private String direction;

    private String purpose;

    private BigDecimal amount;

    private String reference;

    private String description;

    @Column(name = "member_id")
    private String memberId;

    @Column(name = "entry_date")
    private LocalDate entryDate;

    @Column(name = "recorded_by_user_id")
    private String recordedByUserId;

    @Column(name = "created_at")
    private Instant createdAt;

    TreasuryCashEntry(
            String id,
            String tenantId,
            String direction,
            String purpose,
            BigDecimal amount,
            String reference,
            String description,
            String memberId,
            LocalDate entryDate,
            String recordedByUserId) {
        this.id = id;
        this.tenantId = tenantId;
        this.direction = direction;
        this.purpose = purpose;
        this.amount = amount;
        this.reference = reference;
        this.description = description;
        this.memberId = memberId;
        this.entryDate = entryDate;
        this.recordedByUserId = recordedByUserId;
        this.createdAt = Instant.now();
    }
}
