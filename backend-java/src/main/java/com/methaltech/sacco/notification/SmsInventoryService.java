package com.methaltech.sacco.notification;

import com.methaltech.sacco.money.Money;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SmsInventoryService {

    private final JdbcTemplate jdbcTemplate;
    private final List<NotificationProvider> providers;

    public SmsInventorySummary summary() {
        SmsInventorySettings settings = settings();
        BigDecimal sellingRate = money(queryDecimal(
                "SELECT unit_price FROM platform_billing_catalog WHERE code = 'sms_rate'"));
        ProviderBalance providerBalance = providerBalance();
        int saccoCredits = queryInteger(
                "SELECT COALESCE(SUM(balance), 0) FROM sms_wallets WHERE tenant_id <> 'tenant_platform'");
        int memberCredits = queryInteger("SELECT COALESCE(SUM(balance), 0) FROM member_sms_wallets");
        int committedCredits = Math.addExact(saccoCredits, memberCredits);
        int availableCredits = providerBalance.amount() == null
                ? 0
                : providerBalance.amount().divide(settings.providerUnitCost(), 0, RoundingMode.FLOOR).intValue();
        int reserveCredits = availableCredits - committedCredits;
        BigDecimal margin = money(sellingRate.subtract(settings.providerUnitCost()));
        BigDecimal marginPercent = settings.providerUnitCost().signum() == 0
                ? BigDecimal.ZERO
                : margin.multiply(BigDecimal.valueOf(100))
                        .divide(settings.providerUnitCost(), 2, RoundingMode.HALF_UP);
        SalesTotals totals = salesTotals();
        InventoryAlert alert = alert(providerBalance, sellingRate, settings, reserveCredits);
        int topUpCredits = Math.max(0, settings.lowStockThreshold() - reserveCredits);
        BigDecimal suggestedTopUp = money(settings.providerUnitCost().multiply(BigDecimal.valueOf(topUpCredits)));
        return new SmsInventorySummary(
                providerBalance.provider(),
                providerBalance.status(),
                providerBalance.amount(),
                settings.providerUnitCost(),
                sellingRate,
                availableCredits,
                saccoCredits,
                memberCredits,
                committedCredits,
                reserveCredits,
                settings.lowStockThreshold(),
                margin,
                marginPercent,
                totals.credits(),
                totals.revenue(),
                suggestedTopUp,
                alert.level(),
                alert.code(),
                alert.message(),
                providerBalance.checkedAt(),
                settings.updatedAt(),
                settings.updatedBy());
    }

    @Transactional
    public SmsInventorySummary updateSettings(
            BigDecimal providerUnitCost,
            BigDecimal saccoSellingRate,
            int lowStockThreshold,
            String updatedBy) {
        jdbcTemplate.update(
                "UPDATE platform_sms_inventory_settings SET provider_unit_cost = ?, low_stock_threshold = ?, "
                        + "updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = 1",
                money(providerUnitCost), lowStockThreshold, updatedBy);
        jdbcTemplate.update(
                "UPDATE platform_billing_catalog SET unit_price = ?, active = TRUE, updated_at = CURRENT_TIMESTAMP "
                        + "WHERE code = 'sms_rate'",
                money(saccoSellingRate));
        return summary();
    }

    private SmsInventorySettings settings() {
        return jdbcTemplate.queryForObject(
                "SELECT provider_unit_cost, low_stock_threshold, updated_at, updated_by "
                        + "FROM platform_sms_inventory_settings WHERE id = 1",
                (resultSet, rowNumber) -> new SmsInventorySettings(
                        money(resultSet.getBigDecimal("provider_unit_cost")),
                        resultSet.getInt("low_stock_threshold"),
                        resultSet.getTimestamp("updated_at").toInstant(),
                        resultSet.getString("updated_by")));
    }

    private ProviderBalance providerBalance() {
        NotificationProviderStatusResponse status = providers.stream()
                .filter(provider -> "sms".equalsIgnoreCase(provider.channel()))
                .map(NotificationProvider::status)
                .findFirst()
                .orElse(null);
        if (status == null) {
            return new ProviderBalance("unconfigured", "unavailable", null, Instant.now());
        }
        if (!"ready".equalsIgnoreCase(status.status()) || status.balance() == null) {
            return new ProviderBalance(status.provider(), status.status(), null, status.checkedAt());
        }
        String numericBalance = status.balance().replaceAll("[^0-9.]", "");
        try {
            return new ProviderBalance(
                    status.provider(), status.status(), money(new BigDecimal(numericBalance)), status.checkedAt());
        } catch (NumberFormatException exception) {
            return new ProviderBalance(status.provider(), "unavailable", null, status.checkedAt());
        }
    }

    private SalesTotals salesTotals() {
        Integer saccoCredits = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(quantity), 0) FROM sms_wallet_ledger "
                        + "WHERE direction = 'credit' AND (reference IS NULL OR reference NOT LIKE '%-REFUND-%')",
                Integer.class);
        BigDecimal saccoRevenue = queryDecimal(
                "SELECT COALESCE(SUM(amount), 0) FROM sms_wallet_ledger "
                        + "WHERE direction = 'credit' AND (reference IS NULL OR reference NOT LIKE '%-REFUND-%')");
        Integer memberCredits = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(quantity), 0) FROM member_sms_wallet_ledger WHERE direction = 'credit'",
                Integer.class);
        BigDecimal memberRevenue = queryDecimal(
                "SELECT COALESCE(SUM(amount), 0) FROM member_sms_wallet_ledger WHERE direction = 'credit'");
        return new SalesTotals(
                Math.addExact(saccoCredits == null ? 0 : saccoCredits, memberCredits == null ? 0 : memberCredits),
                money(saccoRevenue.add(memberRevenue)));
    }

    private InventoryAlert alert(
            ProviderBalance providerBalance,
            BigDecimal sellingRate,
            SmsInventorySettings settings,
            int reserveCredits) {
        if (providerBalance.amount() == null) {
            return new InventoryAlert("critical", "PROVIDER_BALANCE_UNAVAILABLE",
                    "AfroSMS balance is unavailable. Confirm provider connectivity before selling more credits.");
        }
        if (sellingRate.compareTo(settings.providerUnitCost()) < 0) {
            return new InventoryAlert("critical", "SELLING_BELOW_COST",
                    "The SACCO selling rate is below the AfroSMS supply cost.");
        }
        if (reserveCredits < 0) {
            return new InventoryAlert("critical", "SMS_INVENTORY_OVERCOMMITTED",
                    "Customer wallet credits exceed the SMS capacity currently available from AfroSMS.");
        }
        if (reserveCredits <= settings.lowStockThreshold()) {
            return new InventoryAlert("warning", "SMS_INVENTORY_LOW",
                    "SMS reserve is at or below the configured warning threshold. Top up AfroSMS soon.");
        }
        return new InventoryAlert("ok", "SMS_INVENTORY_HEALTHY", "SMS inventory is healthy.");
    }

    private BigDecimal queryDecimal(String sql) {
        BigDecimal value = jdbcTemplate.queryForObject(sql, BigDecimal.class);
        return value == null ? BigDecimal.ZERO : value;
    }

    private int queryInteger(String sql) {
        Integer value = jdbcTemplate.queryForObject(sql, Integer.class);
        return value == null ? 0 : value;
    }

    private BigDecimal money(BigDecimal value) {
        return Money.normalize(value == null ? BigDecimal.ZERO : value);
    }

    private record SmsInventorySettings(
            BigDecimal providerUnitCost,
            int lowStockThreshold,
            Instant updatedAt,
            String updatedBy) {
    }

    private record ProviderBalance(String provider, String status, BigDecimal amount, Instant checkedAt) {
    }

    private record SalesTotals(int credits, BigDecimal revenue) {
    }

    private record InventoryAlert(String level, String code, String message) {
    }

    public record SmsInventorySummary(
            String provider,
            String providerStatus,
            BigDecimal providerBalance,
            BigDecimal providerUnitCost,
            BigDecimal saccoSellingRate,
            int providerAvailableCredits,
            int saccoCreditsOutstanding,
            int memberCreditsOutstanding,
            int totalCreditsOutstanding,
            int reserveCredits,
            int lowStockThreshold,
            BigDecimal grossMarginPerSms,
            BigDecimal grossMarginPercent,
            int totalCreditsSold,
            BigDecimal totalSalesRevenue,
            BigDecimal suggestedTopUpAmount,
            String alertLevel,
            String alertCode,
            String alertMessage,
            Instant providerCheckedAt,
            Instant settingsUpdatedAt,
            String settingsUpdatedBy) {
    }
}
