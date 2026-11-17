package com.methaltech.sacco.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.h2.jdbcx.JdbcDataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class SmsInventoryServiceTest {

    private JdbcTemplate jdbcTemplate;
    private NotificationProvider provider;
    private SmsInventoryService service;

    @BeforeEach
    void setUp() {
        JdbcDataSource dataSource = new JdbcDataSource();
        dataSource.setURL("jdbc:h2:mem:sms_inventory_" + System.nanoTime() + ";DB_CLOSE_DELAY=-1");
        jdbcTemplate = new JdbcTemplate(dataSource);
        jdbcTemplate.execute("CREATE TABLE platform_sms_inventory_settings (id SMALLINT PRIMARY KEY, provider_unit_cost DECIMAL(19,2), low_stock_threshold INTEGER, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_by VARCHAR(255))");
        jdbcTemplate.execute("INSERT INTO platform_sms_inventory_settings (id, provider_unit_cost, low_stock_threshold, updated_by) VALUES (1, 35, 100, 'test')");
        jdbcTemplate.execute("CREATE TABLE platform_billing_catalog (code VARCHAR(64) PRIMARY KEY, unit_price DECIMAL(19,2), active BOOLEAN, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
        jdbcTemplate.execute("INSERT INTO platform_billing_catalog (code, unit_price, active) VALUES ('sms_rate', 45, TRUE)");
        jdbcTemplate.execute("CREATE TABLE sms_wallets (tenant_id VARCHAR(80) PRIMARY KEY, balance INTEGER)");
        jdbcTemplate.execute("INSERT INTO sms_wallets (tenant_id, balance) VALUES ('tenant_green', 200), ('tenant_blue', 50)");
        jdbcTemplate.execute("CREATE TABLE member_sms_wallets (member_id VARCHAR(80) PRIMARY KEY, balance INTEGER)");
        jdbcTemplate.execute("INSERT INTO member_sms_wallets (member_id, balance) VALUES ('member_1', 25)");
        jdbcTemplate.execute("CREATE TABLE sms_wallet_ledger (direction VARCHAR(16), quantity INTEGER, amount DECIMAL(19,2), reference VARCHAR(120))");
        jdbcTemplate.execute("INSERT INTO sms_wallet_ledger VALUES ('credit', 300, 13500, 'SALE-1')");
        jdbcTemplate.execute("CREATE TABLE member_sms_wallet_ledger (direction VARCHAR(16), quantity INTEGER, amount DECIMAL(19,2))");
        jdbcTemplate.execute("INSERT INTO member_sms_wallet_ledger VALUES ('credit', 50, 2250)");
        provider = mock(NotificationProvider.class);
        when(provider.channel()).thenReturn("sms");
        service = new SmsInventoryService(jdbcTemplate, List.of(provider));
    }

    @Test
    void summarizesProviderCapacityCommitmentsMarginAndSales() {
        when(provider.status()).thenReturn(new NotificationProviderStatusResponse(
                "sms", "afrosms", "ready", "23955", "Ready", Instant.now()));

        SmsInventoryService.SmsInventorySummary summary = service.summary();

        assertEquals(new BigDecimal("23955.00"), summary.providerBalance());
        assertEquals(684, summary.providerAvailableCredits());
        assertEquals(275, summary.totalCreditsOutstanding());
        assertEquals(409, summary.reserveCredits());
        assertEquals(new BigDecimal("10.00"), summary.grossMarginPerSms());
        assertEquals(new BigDecimal("28.57"), summary.grossMarginPercent());
        assertEquals(350, summary.totalCreditsSold());
        assertEquals(new BigDecimal("15750.00"), summary.totalSalesRevenue());
        assertEquals("SMS_INVENTORY_HEALTHY", summary.alertCode());
    }

    @Test
    void warnsWhenOutstandingCreditsConsumeProviderCapacity() {
        when(provider.status()).thenReturn(new NotificationProviderStatusResponse(
                "sms", "afrosms", "ready", "1000", "Ready", Instant.now()));

        SmsInventoryService.SmsInventorySummary summary = service.summary();

        assertEquals(28, summary.providerAvailableCredits());
        assertEquals(-247, summary.reserveCredits());
        assertEquals("critical", summary.alertLevel());
        assertEquals("SMS_INVENTORY_OVERCOMMITTED", summary.alertCode());
        assertEquals(new BigDecimal("12145.00"), summary.suggestedTopUpAmount());
    }

    @Test
    void updatesSupplyCostSellingRateAndThresholdTogether() {
        when(provider.status()).thenReturn(new NotificationProviderStatusResponse(
                "sms", "afrosms", "ready", "50000", "Ready", Instant.now()));

        SmsInventoryService.SmsInventorySummary summary = service.updateSettings(
                new BigDecimal("40"), new BigDecimal("60"), 250, "user_1");

        assertEquals(new BigDecimal("40.00"), summary.providerUnitCost());
        assertEquals(new BigDecimal("60.00"), summary.saccoSellingRate());
        assertEquals(250, summary.lowStockThreshold());
        assertEquals("user_1", summary.settingsUpdatedBy());
    }
}
