package com.methaltech.sacco.notification;

import com.methaltech.sacco.money.Money;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MemberSmsWalletService {

    private final JdbcTemplate jdbcTemplate;
    private final SmsWalletService smsWalletService;

    public int balance(String tenantId, String memberId) {
        ensureWallet(tenantId, memberId);
        Integer value = jdbcTemplate.queryForObject(
                "SELECT balance FROM member_sms_wallets WHERE member_id = ? AND tenant_id = ?",
                Integer.class, memberId, tenantId);
        return value == null ? 0 : value;
    }

    public BigDecimal smsRate() {
        return smsWalletService.smsRate();
    }

    public BigDecimal amountFor(int credits) {
        return smsWalletService.amountFor(credits);
    }

    @Transactional
    public int creditFromPayment(String tenantId, String memberId, BigDecimal amount, String reference) {
        BigDecimal rate = smsRate();
        if (rate.signum() <= 0) throw new IllegalStateException("SMS rate has not been configured by the platform.");
        int credits = Money.normalize(amount).divide(rate, 0, RoundingMode.FLOOR).intValue();
        if (credits <= 0) throw new IllegalStateException("Payment does not cover one SMS credit.");
        ensureWallet(tenantId, memberId);
        jdbcTemplate.update(
                "UPDATE member_sms_wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE member_id = ? AND tenant_id = ?",
                credits, memberId, tenantId);
        ledger(tenantId, memberId, "credit", credits, rate, amount, reference, "Member SMS credit purchase");
        return credits;
    }

    @Transactional
    public void debit(String tenantId, String memberId, int quantity, String reference, String description) {
        if (quantity <= 0) return;
        ensureWallet(tenantId, memberId);
        int updated = jdbcTemplate.update(
                "UPDATE member_sms_wallets SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE member_id = ? AND tenant_id = ? AND balance >= ?",
                quantity, memberId, tenantId, quantity);
        if (updated == 0) throw new IllegalStateException("Insufficient SMS balance. Buy SMS credits or choose email.");
        ledger(tenantId, memberId, "debit", quantity, smsRate(), amountFor(quantity), reference, description);
    }

    @Transactional
    public void refund(String tenantId, String memberId, int quantity, String relatedReference, String description) {
        if (quantity <= 0) return;
        ensureWallet(tenantId, memberId);
        jdbcTemplate.update(
                "UPDATE member_sms_wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE member_id = ? AND tenant_id = ?",
                quantity, memberId, tenantId);
        ledger(tenantId, memberId, "refund", quantity, smsRate(), amountFor(quantity),
                relatedReference + "-REFUND-" + UUID.randomUUID(), description);
    }

    private void ensureWallet(String tenantId, String memberId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM member_sms_wallets WHERE member_id = ? AND tenant_id = ?",
                Integer.class, memberId, tenantId);
        if (count != null && count > 0) return;
        try {
            jdbcTemplate.update(
                    "INSERT INTO member_sms_wallets (member_id, tenant_id, balance) VALUES (?, ?, 0)",
                    memberId, tenantId);
        } catch (DuplicateKeyException ignored) {
            // A concurrent request created the wallet first.
        }
    }

    private void ledger(String tenantId, String memberId, String direction, int quantity,
            BigDecimal unitPrice, BigDecimal amount, String reference, String description) {
        jdbcTemplate.update(
                "INSERT INTO member_sms_wallet_ledger (id, member_id, tenant_id, direction, quantity, unit_price, amount, reference, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                "member_sms_" + UUID.randomUUID(), memberId, tenantId, direction, quantity,
                unitPrice, Money.normalize(amount), reference, description);
    }
}
