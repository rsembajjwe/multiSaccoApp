package com.methaltech.sacco.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import org.h2.jdbcx.JdbcDataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class SmsWalletServiceTest {

    private JdbcTemplate jdbcTemplate;
    private SmsWalletService service;

    @BeforeEach
    void setUp() {
        JdbcDataSource dataSource = new JdbcDataSource();
        dataSource.setURL("jdbc:h2:mem:sms_wallet_" + System.nanoTime() + ";DB_CLOSE_DELAY=-1");
        jdbcTemplate = new JdbcTemplate(dataSource);
        jdbcTemplate.execute("CREATE TABLE platform_billing_catalog (code VARCHAR(40) PRIMARY KEY, unit_price DECIMAL(19,4))");
        jdbcTemplate.execute("INSERT INTO platform_billing_catalog (code, unit_price) VALUES ('sms_rate', 50)");
        jdbcTemplate.execute("CREATE TABLE sms_wallets (tenant_id VARCHAR(80) PRIMARY KEY, balance INTEGER, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
        jdbcTemplate.execute("CREATE TABLE sms_wallet_ledger (id VARCHAR(80), tenant_id VARCHAR(80), direction VARCHAR(16), quantity INTEGER, unit_price DECIMAL(19,4), amount DECIMAL(19,4), reference VARCHAR(120), description VARCHAR(255))");
        service = new SmsWalletService(jdbcTemplate);
    }

    @Test
    void cashPaymentCreditsSmsAtProprietorRate() {
        int credits = service.creditFromPayment(
                "tenant_new", new BigDecimal("5000"), "CASH-001", "Cash SMS credit purchase");

        assertEquals(100, credits);
        assertEquals(100, service.balance("tenant_new"));
        assertTrue(service.referenceExists("tenant_new", "CASH-001"));
        assertEquals("Cash SMS credit purchase", jdbcTemplate.queryForObject(
                "SELECT description FROM sms_wallet_ledger WHERE reference = 'CASH-001'", String.class));
    }
}
