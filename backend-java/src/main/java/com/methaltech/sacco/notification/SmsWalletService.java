package com.methaltech.sacco.notification;

import com.methaltech.sacco.money.Money;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SmsWalletService {

    private final JdbcTemplate jdbcTemplate;

    public int balance(String tenantId) {
        ensureWallet(tenantId);
        Integer value = jdbcTemplate.queryForObject(
                "SELECT balance FROM sms_wallets WHERE tenant_id = ?",
                Integer.class,
                tenantId);
        return value == null ? 0 : value;
    }

    public BigDecimal smsRate() {
        BigDecimal rate = jdbcTemplate.queryForObject(
                "SELECT unit_price FROM platform_billing_catalog WHERE code = 'sms_rate'",
                BigDecimal.class);
        return rate == null ? BigDecimal.ZERO : Money.normalize(rate);
    }

    public BigDecimal amountFor(int smsCount) {
        if (smsCount <= 0) return BigDecimal.ZERO;
        return Money.normalize(smsRate().multiply(BigDecimal.valueOf(smsCount)));
    }

    @Transactional
    public int creditFromPayment(String tenantId, BigDecimal amount, String reference) {
        BigDecimal rate = smsRate();
        if (rate.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException("SMS rate has not been configured by the platform.");
        }
        int credits = Money.normalize(amount).divide(rate, 0, RoundingMode.FLOOR).intValue();
        if (credits <= 0) {
            throw new IllegalStateException("Payment does not cover one SMS credit.");
        }
        ensureWallet(tenantId);
        jdbcTemplate.update(
                "UPDATE sms_wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE tenant_id = ?",
                credits,
                tenantId);
        ledger(tenantId, "credit", credits, rate, amount, reference, "Mobile-money SMS credit purchase");
        return credits;
    }

    @Transactional
    public void debit(String tenantId, int quantity, String reference, String description) {
        if (quantity <= 0) return;
        ensureWallet(tenantId);
        int updated = jdbcTemplate.update(
                "UPDATE sms_wallets SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE tenant_id = ? AND balance >= ?",
                quantity,
                tenantId,
                quantity);
        if (updated == 0) {
            throw new IllegalStateException("Insufficient SMS balance. Buy SMS credits before sending.");
        }
        BigDecimal rate = smsRate();
        ledger(tenantId, "debit", quantity, rate, amountFor(quantity), reference, description);
    }

    private void ensureWallet(String tenantId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM sms_wallets WHERE tenant_id = ?",
                Integer.class,
                tenantId);
        if (count == null || count == 0) {
            jdbcTemplate.update(
                    "INSERT INTO sms_wallets (tenant_id, balance) VALUES (?, 0)",
                    tenantId);
        }
    }

    private void ledger(
            String tenantId,
            String direction,
            int quantity,
            BigDecimal unitPrice,
            BigDecimal amount,
            String reference,
            String description) {
        jdbcTemplate.update(
                """
                INSERT INTO sms_wallet_ledger
                    (id, tenant_id, direction, quantity, unit_price, amount, reference, description)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                "sms_ledger_" + UUID.randomUUID(),
                tenantId,
                direction,
                quantity,
                unitPrice,
                Money.normalize(amount),
                reference,
                description);
    }
}
