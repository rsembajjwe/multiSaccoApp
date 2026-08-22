package com.methaltech.sacco.tenant;

import java.time.LocalDate;
import java.time.YearMonth;
import java.math.BigDecimal;
import org.springframework.stereotype.Service;

@Service
public class SaccoMembershipPolicyService {

    private final SaccoProfileRepository saccoProfileRepository;

    SaccoMembershipPolicyService(SaccoProfileRepository saccoProfileRepository) {
        this.saccoProfileRepository = saccoProfileRepository;
    }

    public MembershipDuesPolicy policyForTenant(String tenantId) {
        return saccoProfileRepository.findByTenantId(tenantId)
                .map(profile -> new MembershipDuesPolicy(
                        normalizePeriod(profile.getMembershipDuesPeriod()),
                        normalizeMonth(profile.getMembershipCalendarStartMonth()),
                        normalizeDay(profile.getMembershipCalendarStartDay()),
                        normalizeAmount(profile.getMembershipSubscriptionAmount())))
                .orElseGet(() -> new MembershipDuesPolicy("annual", 1, 1, BigDecimal.valueOf(5000)));
    }

    public LocalDate nextExpiry(String tenantId, LocalDate base, String billingPeriod) {
        MembershipDuesPolicy policy = policyForTenant(tenantId);
        String period = normalizePeriod(billingPeriod == null || billingPeriod.isBlank() ? policy.billingPeriod() : billingPeriod);
        if ("once".equals(period)) {
            return null;
        }
        if ("monthly".equals(period)) {
            return base.plusMonths(1);
        }
        LocalDate renewalDate = calendarDateForYear(base.getYear(), policy.startMonth(), policy.startDay());
        if (!renewalDate.isAfter(base)) {
            renewalDate = calendarDateForYear(base.getYear() + 1, policy.startMonth(), policy.startDay());
        }
        return renewalDate;
    }

    public String normalizePeriod(String billingPeriod) {
        if ("once".equalsIgnoreCase(billingPeriod) || "one_time".equalsIgnoreCase(billingPeriod)) {
            return "once";
        }
        return "monthly".equalsIgnoreCase(billingPeriod) ? "monthly" : "annual";
    }

    private LocalDate calendarDateForYear(int year, int month, int day) {
        YearMonth yearMonth = YearMonth.of(year, month);
        return LocalDate.of(year, month, Math.min(day, yearMonth.lengthOfMonth()));
    }

    private int normalizeMonth(Integer month) {
        if (month == null || month < 1 || month > 12) {
            return 1;
        }
        return month;
    }

    private int normalizeDay(Integer day) {
        if (day == null || day < 1 || day > 31) {
            return 1;
        }
        return day;
    }

    private BigDecimal normalizeAmount(BigDecimal amount) {
        return amount == null || amount.signum() <= 0 ? BigDecimal.valueOf(5000) : amount;
    }

    public record MembershipDuesPolicy(String billingPeriod, int startMonth, int startDay, BigDecimal amount) {
    }
}
