package com.methaltech.sacco.finance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "financial_accounts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class FinancialAccount {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "member_id")
    private String memberId;

    @Column(name = "product_id")
    private String productId;

    @Column(name = "account_type")
    private String accountType;

    @Column(name = "account_no")
    private String accountNo;

    private String status;

    @Column(name = "opened_by_user_id")
    private String openedByUserId;

    @Column(name = "opened_at")
    private Instant openedAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    FinancialAccount(
            String id,
            String tenantId,
            String memberId,
            String productId,
            String accountType,
            String accountNo,
            String openedByUserId) {
        this.id = id;
        this.tenantId = tenantId;
        this.memberId = memberId;
        this.productId = productId;
        this.accountType = accountType;
        this.accountNo = accountNo;
        this.status = "active";
        this.openedByUserId = openedByUserId;
        this.openedAt = Instant.now();
        this.updatedAt = this.openedAt;
    }
}
