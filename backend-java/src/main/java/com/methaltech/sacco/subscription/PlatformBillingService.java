package com.methaltech.sacco.subscription;

import com.methaltech.sacco.subscription.BillingResponses.BillingLine;
import com.methaltech.sacco.subscription.BillingResponses.BillingSummaryResponse;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Composes a SACCO's full platform bill: the base subscription plus the add-on revenue avenues — paid
 * modules, premium support, one-time setup, staff-seat and branch overage, and metered SMS. None of these
 * touch member funds. Cross-package counts (users, branches, SMS deliveries, tier limits) are read via
 * JdbcTemplate to avoid coupling to other modules' repositories.
 */
@Service
class PlatformBillingService {

    private final BillingCatalogRepository catalogRepository;
    private final TenantBillingItemRepository billingItemRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final JdbcTemplate jdbcTemplate;

    PlatformBillingService(
            BillingCatalogRepository catalogRepository,
            TenantBillingItemRepository billingItemRepository,
            SubscriptionRepository subscriptionRepository,
            JdbcTemplate jdbcTemplate) {
        this.catalogRepository = catalogRepository;
        this.billingItemRepository = billingItemRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    List<BillingCatalogItem> catalog() {
        return catalogRepository.findAllByOrderByCategoryAscCodeAsc();
    }

    BillingSummaryResponse summaryFor(String tenantId) {
        Map<String, BillingCatalogItem> catalog = catalogRepository.findAll().stream()
                .collect(Collectors.toMap(BillingCatalogItem::getCode, item -> item));

        Subscription subscription = subscriptionRepository.findFirstByTenantIdOrderByCreatedAtDesc(tenantId).orElse(null);
        BigDecimal base = subscription == null ? BigDecimal.ZERO : nz(subscription.getAmount());

        List<BillingLine> lines = new ArrayList<>();
        lines.add(new BillingLine("subscription", "Base subscription", 1, money(base), money(base), "annual"));

        // Add-on modules, premium support and one-time setup selected for this SACCO.
        for (TenantBillingItem item : billingItemRepository.findByTenantIdAndStatusOrderByCreatedAtAsc(tenantId, "active")) {
            BillingCatalogItem rate = catalog.get(item.getCatalogCode());
            if (rate == null || !rate.isActive()) continue;
            addLine(lines, rate, item.getQuantity());
        }

        // Staff-seat and branch overage beyond the tier limit.
        if (subscription != null) {
            int[] limits = packageLimits(subscription.getPackageId());
            if (limits != null) {
                addLine(lines, catalog.get("overage_user"), Math.max(0, count("users", tenantId) - limits[0]));
                addLine(lines, catalog.get("overage_branch"), Math.max(0, count("branches", tenantId) - limits[1]));
            }
        }

        // Metered charged-channel usage: SMS and WhatsApp both cost money to send. Email and push are free.
        addLine(lines, catalog.get("sms_rate"), channelCount(tenantId, "sms"));
        addLine(lines, catalog.get("whatsapp_rate"), channelCount(tenantId, "whatsapp"));

        BigDecimal annual = sumByPeriod(lines, "annual").add(sumByPeriod(lines, "monthly"));
        BigDecimal oneTime = sumByPeriod(lines, "one_time");
        BigDecimal usage = sumByPeriod(lines, "metered");
        BigDecimal total = lines.stream().map(BillingLine::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new BillingSummaryResponse(tenantId, money(base), lines, money(annual), money(oneTime), money(usage), money(total));
    }

    private void addLine(List<BillingLine> lines, BillingCatalogItem rate, int quantity) {
        if (rate == null || !rate.isActive() || quantity <= 0) return;
        BigDecimal amount = money(nz(rate.getUnitPrice()).multiply(BigDecimal.valueOf(quantity)));
        lines.add(new BillingLine(rate.getCategory(), rate.getName(), quantity, money(nz(rate.getUnitPrice())), amount, rate.getBillingPeriod()));
    }

    private int[] packageLimits(String packageId) {
        if (packageId == null) return null;
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT user_limit, branch_limit FROM subscription_packages WHERE id = ?",
                    (rs, rowNum) -> new int[] {rs.getInt(1), rs.getInt(2)},
                    packageId);
        } catch (EmptyResultDataAccessException notFound) {
            return null;
        }
    }

    private int count(String table, String tenantId) {
        Integer value = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM " + table + " WHERE tenant_id = ?", Integer.class, tenantId);
        return value == null ? 0 : value;
    }

    private int channelCount(String tenantId, String channel) {
        Integer value = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM notification_deliveries WHERE tenant_id = ? AND LOWER(channel) LIKE ? AND status = 'sent'",
                Integer.class, tenantId, "%" + channel.toLowerCase() + "%");
        return value == null ? 0 : value;
    }

    private static BigDecimal sumByPeriod(List<BillingLine> lines, String period) {
        return lines.stream()
                .filter(line -> period.equals(line.billingPeriod()))
                .map(BillingLine::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static BigDecimal nz(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private static BigDecimal money(BigDecimal value) {
        return nz(value).setScale(2, RoundingMode.HALF_UP);
    }
}
