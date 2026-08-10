package com.methaltech.sacco.tenant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * A collection account owned by a SACCO - its own mobile-money number/merchant code or bank account -
 * that members pay into directly. The SACCO admin manages these; the platform never holds the funds.
 */
@Entity
@Table(name = "sacco_payment_accounts")
public class SaccoPaymentAccount {

    public static final String CHANNEL_MOBILE_MONEY = "mobile_money";
    public static final String CHANNEL_BANK = "bank";

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    private String channel;

    private String network;

    @Column(name = "account_name")
    private String accountName;

    @Column(name = "account_number")
    private String accountNumber;

    @Column(name = "bank_name")
    private String bankName;

    private String branch;

    @Column(name = "swift_code")
    private String swiftCode;

    private String instructions;

    private boolean active;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    protected SaccoPaymentAccount() {
    }

    public SaccoPaymentAccount(
            String id,
            String tenantId,
            String channel,
            String network,
            String accountName,
            String accountNumber,
            String bankName,
            String branch,
            String swiftCode,
            String instructions) {
        this.id = id;
        this.tenantId = tenantId;
        this.channel = channel;
        this.network = network;
        this.accountName = accountName;
        this.accountNumber = accountNumber;
        this.bankName = bankName;
        this.branch = branch;
        this.swiftCode = swiftCode;
        this.instructions = instructions;
        this.active = true;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public void update(
            String network,
            String accountName,
            String accountNumber,
            String bankName,
            String branch,
            String swiftCode,
            String instructions,
            boolean active) {
        this.network = network;
        this.accountName = accountName;
        this.accountNumber = accountNumber;
        this.bankName = bankName;
        this.branch = branch;
        this.swiftCode = swiftCode;
        this.instructions = instructions;
        this.active = active;
        this.updatedAt = Instant.now();
    }

    public boolean isMobileMoney() {
        return CHANNEL_MOBILE_MONEY.equals(channel);
    }

    public boolean isBank() {
        return CHANNEL_BANK.equals(channel);
    }

    public String getId() {
        return id;
    }

    public String getTenantId() {
        return tenantId;
    }

    public String getChannel() {
        return channel;
    }

    public String getNetwork() {
        return network;
    }

    public String getAccountName() {
        return accountName;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public String getBankName() {
        return bankName;
    }

    public String getBranch() {
        return branch;
    }

    public String getSwiftCode() {
        return swiftCode;
    }

    public String getInstructions() {
        return instructions;
    }

    public boolean isActive() {
        return active;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
