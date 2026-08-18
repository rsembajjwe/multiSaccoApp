package com.methaltech.sacco.finance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Set;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * A configurable SACCO fund source (a member-contribution fund). Savings, Shares and Welfare are seeded
 * as {@code isSystem} defaults; the SACCO Administrator adds custom funds (Burial, Education, ...). The
 * {@code basis} decides which built-in mechanics the fund follows. Allowed {@code basis} values are
 * enforced here (not via DB CHECK constraints) for H2/PostgreSQL parity.
 */
@Entity
@Table(name = "sacco_fund_types")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class FundType {

    static final Set<String> BASES = Set.of("savings", "shares", "welfare");

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    private String code;

    private String name;

    private String basis;

    private String description;

    @Column(name = "is_system")
    private boolean system;

    private boolean active;

    @Column(name = "display_order")
    private int displayOrder;

    @Column(name = "created_by_user_id")
    private String createdByUserId;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    FundType(
            String id,
            String tenantId,
            String code,
            String name,
            String basis,
            String description,
            boolean system,
            boolean active,
            int displayOrder,
            String createdByUserId) {
        this.id = id;
        this.tenantId = tenantId;
        this.code = code;
        this.name = name;
        this.basis = basis;
        this.description = description;
        this.system = system;
        this.active = active;
        this.displayOrder = displayOrder;
        this.createdByUserId = createdByUserId;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    /**
     * Apply an edit. System funds keep their {@code code} and {@code basis} (only display attributes and
     * activation change); custom funds may change {@code basis} too.
     */
    void update(String name, String basis, String description, boolean active, int displayOrder) {
        this.name = name;
        if (!this.system) {
            this.basis = basis;
        }
        this.description = description;
        this.active = active;
        this.displayOrder = displayOrder;
        this.updatedAt = Instant.now();
    }
}
