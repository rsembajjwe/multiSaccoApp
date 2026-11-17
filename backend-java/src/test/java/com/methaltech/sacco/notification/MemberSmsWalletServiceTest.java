package com.methaltech.sacco.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import org.h2.jdbcx.JdbcDataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class MemberSmsWalletServiceTest {

    private JdbcTemplate jdbcTemplate;
    private SmsWalletService platformWallet;
    private MemberSmsWalletService service;

    @BeforeEach
    void setUp() {
        JdbcDataSource dataSource = new JdbcDataSource();
        dataSource.setURL("jdbc:h2:mem:member_sms_wallet_" + System.nanoTime() + ";DB_CLOSE_DELAY=-1");
        jdbcTemplate = new JdbcTemplate(dataSource);
        jdbcTemplate.execute("CREATE TABLE member_sms_wallets (member_id VARCHAR(255) PRIMARY KEY, tenant_id VARCHAR(255) NOT NULL, balance INTEGER NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
        jdbcTemplate.execute("CREATE TABLE member_sms_wallet_ledger (id VARCHAR(255) PRIMARY KEY, member_id VARCHAR(255), tenant_id VARCHAR(255), direction VARCHAR(20), quantity INTEGER, unit_price DECIMAL(19,2), amount DECIMAL(19,2), reference VARCHAR(255), description VARCHAR(500), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
        platformWallet = mock(SmsWalletService.class);
        when(platformWallet.smsRate()).thenReturn(new BigDecimal("35.00"));
        when(platformWallet.amountFor(anyInt())).thenAnswer(invocation ->
                new BigDecimal("35.00").multiply(BigDecimal.valueOf(invocation.getArgument(0, Integer.class))));
        service = new MemberSmsWalletService(jdbcTemplate, platformWallet);
    }

    @Test
    void creditsDebitsAndRefundsMemberOwnedWallet() {
        assertEquals(0, service.balance("tenant_green", "member_1"));
        assertEquals(2, service.creditFromPayment("tenant_green", "member_1", new BigDecimal("100"), "PAY-1"));
        assertEquals(2, service.balance("tenant_green", "member_1"));

        service.debit("tenant_green", "member_1", 1, "SEND-1", "Password reset SMS");
        service.refund("tenant_green", "member_1", 1, "SEND-1", "Delivery failed");

        assertEquals(2, service.balance("tenant_green", "member_1"));
        assertEquals(3, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM member_sms_wallet_ledger WHERE member_id = 'member_1'", Integer.class));
        assertEquals(new BigDecimal("35.00"), service.smsRate());
        assertEquals(new BigDecimal("70.00"), service.amountFor(2));
    }

    @Test
    void rejectsUnfundedOrMisconfiguredPurchasesAndIgnoresZeroMovements() {
        assertThrows(IllegalStateException.class,
                () -> service.debit("tenant_green", "member_2", 1, "SEND-2", "No credit"));
        assertThrows(IllegalStateException.class,
                () -> service.creditFromPayment("tenant_green", "member_2", new BigDecimal("20"), "PAY-LOW"));

        when(platformWallet.smsRate()).thenReturn(BigDecimal.ZERO);
        assertThrows(IllegalStateException.class,
                () -> service.creditFromPayment("tenant_green", "member_2", new BigDecimal("100"), "PAY-NO-RATE"));

        service.debit("tenant_green", "member_3", 0, "NOOP-1", "No operation");
        service.refund("tenant_green", "member_3", 0, "NOOP-2", "No operation");
        assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM member_sms_wallets WHERE member_id = 'member_3'", Integer.class));
    }
}
