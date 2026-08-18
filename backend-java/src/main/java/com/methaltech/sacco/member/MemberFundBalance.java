package com.methaltech.sacco.member;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * A member's balance in one fund (built-in or custom). The three base funds mirror the columns on
 * {@link Member}; custom funds live only here. Balances move through {@link MemberFundBalanceService}.
 */
@Entity
@Table(name = "member_fund_balances")
public class MemberFundBalance {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "member_id")
    private String memberId;

    @Column(name = "fund_code")
    private String fundCode;

    private BigDecimal balance;

    @Column(name = "updated_at")
    private Instant updatedAt;

    protected MemberFundBalance() {
    }

    MemberFundBalance(String id, String tenantId, String memberId, String fundCode, BigDecimal balance) {
        this.id = id;
        this.tenantId = tenantId;
        this.memberId = memberId;
        this.fundCode = fundCode;
        this.balance = balance == null ? BigDecimal.ZERO : balance;
        this.updatedAt = Instant.now();
    }

    void addAmount(BigDecimal delta) {
        this.balance = (this.balance == null ? BigDecimal.ZERO : this.balance).add(delta);
        if (this.balance.signum() < 0) {
            this.balance = BigDecimal.ZERO;
        }
        this.updatedAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public String getTenantId() {
        return tenantId;
    }

    public String getMemberId() {
        return memberId;
    }

    public String getFundCode() {
        return fundCode;
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
