package com.methaltech.sacco.tenant;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.YearMonth;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

record FleetSummaryResponse(
        long totalOrganizations, long healthy, long attention, long critical,
        long active, long pendingReview, long suspended, long unassigned,
        long renewalsDueIn30Days, long expiredSubscriptions,
        BigDecimal outstandingSubscriptionBalance, BigDecimal totalSubscriptionRevenue, int averageOnboarding,
        Map<String, Long> lifecycleDistribution, Map<String, Long> healthDistribution,
        Map<String, Long> subscriptionDistribution, Map<String, Long> portfolioDistribution,
        Map<String, Long> districtDistribution, List<Workload> portfolioWorkloads,
        List<Workload> districtWorkloads, long slaBreached, long slaDueSoon,
        List<RiskIncident> riskQueue, long renewalsDueIn90Days,
        BigDecimal projectedRenewalValue90Days, List<RenewalForecast> renewalForecast) {

    static FleetSummaryResponse from(List<FleetTenantResponse> fleet) {
        Map<String, Long> lifecycle = counts(fleet, true);
        Map<String, Long> health = counts(fleet, false);
        Map<String, Long> subscriptions = countValues(fleet.stream().map(FleetTenantResponse::subscriptionStatus).toList(), "unassigned");
        Map<String, Long> portfolios = countValues(fleet.stream().map(FleetTenantResponse::accountManagerName).toList(), "Unassigned");
        Map<String, Long> districts = countValues(fleet.stream().map(FleetTenantResponse::district).toList(), "Not specified");
        LocalDate today = LocalDate.now();
        long renewalsDue = fleet.stream()
                .filter(row -> row.subscriptionExpiry() != null)
                .filter(row -> !row.subscriptionExpiry().isBefore(today))
                .filter(row -> !row.subscriptionExpiry().isAfter(today.plusDays(30)))
                .count();
        long expired = fleet.stream()
                .filter(row -> "expired".equals(row.subscriptionStatus())
                        || (row.subscriptionExpiry() != null && row.subscriptionExpiry().isBefore(today)))
                .count();
        BigDecimal outstanding = fleet.stream().map(FleetTenantResponse::balanceDue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal subscriptionRevenue = fleet.stream().map(FleetTenantResponse::subscriptionAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        int onboarding = fleet.isEmpty() ? 0 : BigDecimal.valueOf(fleet.stream()
                        .mapToInt(FleetTenantResponse::onboarding).average().orElse(0))
                .setScale(0, RoundingMode.HALF_UP).intValue();
        List<RiskIncident> incidents = riskIncidents(fleet);
        List<RenewalForecast> forecast = renewalForecast(fleet);
        LocalDate ninetyDays = today.plusDays(90);
        return new FleetSummaryResponse(
                fleet.size(), health.getOrDefault("healthy", 0L), health.getOrDefault("attention", 0L),
                health.getOrDefault("critical", 0L), lifecycle.getOrDefault("active", 0L),
                lifecycle.getOrDefault("pending_review", 0L), lifecycle.getOrDefault("suspended", 0L),
                fleet.stream().filter(row -> row.accountManagerUserId() == null || row.accountManagerUserId().isBlank()).count(),
                renewalsDue, expired, outstanding, subscriptionRevenue, onboarding, lifecycle, health,
                subscriptions, portfolios, districts,
                workloads(fleet, true), workloads(fleet, false),
                incidents.stream().filter(incident -> "breached".equals(incident.slaStatus())).count(),
                incidents.stream().filter(incident -> "due_soon".equals(incident.slaStatus())).count(), incidents,
                fleet.stream().filter(row -> row.subscriptionExpiry() != null)
                        .filter(row -> !row.subscriptionExpiry().isBefore(today) && !row.subscriptionExpiry().isAfter(ninetyDays)).count(),
                fleet.stream().filter(row -> row.subscriptionExpiry() != null)
                        .filter(row -> !row.subscriptionExpiry().isBefore(today) && !row.subscriptionExpiry().isAfter(ninetyDays))
                        .map(FleetTenantResponse::subscriptionAmount).reduce(BigDecimal.ZERO, BigDecimal::add), forecast);
    }

    private static Map<String, Long> counts(List<FleetTenantResponse> fleet, boolean lifecycle) {
        Map<String, Long> counts = new LinkedHashMap<>();
        fleet.forEach(row -> counts.merge(lifecycle ? row.status() : row.health(), 1L, Long::sum));
        return counts;
    }

    private static Map<String, Long> countValues(List<String> values, String fallback) {
        Map<String, Long> counts = new LinkedHashMap<>();
        values.stream()
                .map(value -> value == null || value.isBlank() ? fallback : value)
                .forEach(value -> counts.merge(value, 1L, Long::sum));
        return counts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed().thenComparing(Map.Entry.comparingByKey()))
                .collect(LinkedHashMap::new, (map, entry) -> map.put(entry.getKey(), entry.getValue()), Map::putAll);
    }

    private static List<Workload> workloads(List<FleetTenantResponse> fleet, boolean portfolio) {
        Map<String, WorkloadAccumulator> grouped = new LinkedHashMap<>();
        fleet.forEach(row -> {
            String id = portfolio
                    ? blankToDefault(row.accountManagerUserId(), "unassigned")
                    : blankToDefault(row.district(), "not-specified");
            String label = portfolio
                    ? blankToDefault(row.accountManagerName(), "Unassigned")
                    : blankToDefault(row.district(), "Not specified");
            WorkloadAccumulator accumulator = grouped.computeIfAbsent(id, ignored -> new WorkloadAccumulator(id, label));
            accumulator.total++;
            if ("critical".equals(row.health())) accumulator.critical++;
            if ("attention".equals(row.health())) accumulator.attention++;
        });
        return grouped.values().stream()
                .map(value -> new Workload(value.id, value.label, value.total, value.critical, value.attention))
                .sorted(java.util.Comparator.comparingLong(Workload::critical).reversed()
                        .thenComparing(java.util.Comparator.comparingLong(Workload::total).reversed())
                        .thenComparing(Workload::label))
                .toList();
    }

    private static String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    record Workload(String id, String label, long total, long critical, long attention) {
    }

    private static List<RiskIncident> riskIncidents(List<FleetTenantResponse> fleet) {
        Instant now = Instant.now();
        return fleet.stream()
                .filter(row -> !"healthy".equals(row.health()))
                .map(row -> {
                    Instant openedAt = incidentOpenedAt(row, now);
                    long targetHours = "critical".equals(row.health()) ? 4 : 24;
                    Instant dueAt = openedAt.plus(Duration.ofHours(targetHours));
                    String slaStatus = now.isAfter(dueAt) ? "breached"
                            : Duration.between(now, dueAt).compareTo(Duration.ofHours(2)) <= 0 ? "due_soon" : "within_sla";
                    String issueType = issueType(row.healthReason());
                    return new RiskIncident(row.id() + ":" + issueType, issueType,
                            row.id(), row.saccoCode(), row.name(), row.health(), row.healthReason(),
                            row.district(), row.accountManagerName(), openedAt, dueAt, slaStatus);
                })
                .sorted(java.util.Comparator.comparingInt((RiskIncident incident) -> slaRank(incident.slaStatus()))
                        .thenComparing(RiskIncident::dueAt)
                        .thenComparing(RiskIncident::organizationName))
                .toList();
    }

    private static Instant incidentOpenedAt(FleetTenantResponse row, Instant now) {
        if (row.subscriptionExpiry() != null && row.healthReason().contains("expired")) {
            return row.subscriptionExpiry().plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        }
        if (row.subscriptionExpiry() != null && row.healthReason().contains("within 30 days")) {
            return row.subscriptionExpiry().minusDays(30).atStartOfDay().toInstant(ZoneOffset.UTC);
        }
        return row.updatedAt() == null ? now : row.updatedAt();
    }

    private static int slaRank(String status) {
        return switch (status) {
            case "breached" -> 0;
            case "due_soon" -> 1;
            default -> 2;
        };
    }

    private static String issueType(String reason) {
        if (reason.contains("expired")) return "subscription_expired";
        if (reason.contains("within 30 days")) return "renewal_due";
        if (reason.contains("No subscription")) return "subscription_missing";
        if (reason.contains("Platform access")) return "access_restricted";
        return "lifecycle_review";
    }

    record RiskIncident(String incidentKey, String issueType, String tenantId, String organizationCode, String organizationName,
            String severity, String issue, String district, String accountManagerName,
            Instant openedAt, Instant dueAt, String slaStatus) {
    }

    private static List<RenewalForecast> renewalForecast(List<FleetTenantResponse> fleet) {
        YearMonth firstMonth = YearMonth.now();
        return java.util.stream.IntStream.range(0, 6)
                .mapToObj(firstMonth::plusMonths)
                .map(month -> {
                    List<FleetTenantResponse> due = fleet.stream()
                            .filter(row -> row.subscriptionExpiry() != null)
                            .filter(row -> !row.subscriptionExpiry().isBefore(LocalDate.now()))
                            .filter(row -> YearMonth.from(row.subscriptionExpiry()).equals(month))
                            .toList();
                    return new RenewalForecast(month.toString(), month.atDay(1), month.atEndOfMonth(), due.size(),
                            due.stream().map(FleetTenantResponse::subscriptionAmount).reduce(BigDecimal.ZERO, BigDecimal::add),
                            due.stream().map(FleetTenantResponse::balanceDue).reduce(BigDecimal.ZERO, BigDecimal::add));
                })
                .toList();
    }

    record RenewalForecast(String period, LocalDate startDate, LocalDate endDate,
            long organizations, BigDecimal projectedValue, BigDecimal outstandingBalance) {
    }

    private static final class WorkloadAccumulator {
        private final String id;
        private final String label;
        private long total;
        private long critical;
        private long attention;

        private WorkloadAccumulator(String id, String label) {
            this.id = id;
            this.label = label;
        }
    }
}
