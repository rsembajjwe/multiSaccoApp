package com.methaltech.sacco.tenant;

import java.time.Clock;
import java.time.LocalDate;
import java.time.Month;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class SavingsWithdrawalPolicyService {

    private final SaccoProfileRepository profileRepository;
    private final Clock clock;

    @Autowired
    SavingsWithdrawalPolicyService(SaccoProfileRepository profileRepository) {
        this(profileRepository, Clock.systemDefaultZone());
    }

    SavingsWithdrawalPolicyService(SaccoProfileRepository profileRepository, Clock clock) {
        this.profileRepository = profileRepository;
        this.clock = clock;
    }

    public WithdrawalWindow current(String tenantId) {
        return current(tenantId, LocalDate.now(clock));
    }

    WithdrawalWindow current(String tenantId, LocalDate today) {
        SaccoProfile profile = profileRepository.findByTenantId(tenantId).orElse(null);
        if (profile == null || !"annual".equalsIgnoreCase(profile.getSavingsCyclePeriod())) {
            return new WithdrawalWindow(true, "continuous", null, null, null);
        }
        int month = normalize(profile.getSavingsCycleStartMonth(), 1, 12, 1);
        int requestedDay = normalize(profile.getSavingsCycleStartDay(), 1, 31, 1);
        int windowDays = normalize(profile.getSavingsWithdrawalWindowDays(), 1, 366, 30);
        LocalDate thisYear = date(today.getYear(), month, requestedDay);
        LocalDate opens = thisYear;
        LocalDate closes = opens.plusDays(windowDays - 1L);
        boolean allowed = !today.isBefore(opens) && !today.isAfter(closes);
        LocalDate nextOpens = allowed || today.isBefore(opens)
                ? opens
                : date(today.getYear() + 1, month, requestedDay);
        return new WithdrawalWindow(allowed, "annual", opens, closes, nextOpens);
    }

    private LocalDate date(int year, int month, int requestedDay) {
        int day = Math.min(requestedDay, Month.of(month).length(java.time.Year.isLeap(year)));
        return LocalDate.of(year, month, day);
    }

    private int normalize(Integer value, int minimum, int maximum, int fallback) {
        return value != null && value >= minimum && value <= maximum ? value : fallback;
    }

    public record WithdrawalWindow(
            boolean allowed,
            String period,
            LocalDate opensOn,
            LocalDate closesOn,
            LocalDate nextOpensOn) {
    }
}
