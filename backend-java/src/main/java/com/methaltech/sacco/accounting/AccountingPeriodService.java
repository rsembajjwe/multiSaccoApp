package com.methaltech.sacco.accounting;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import org.springframework.stereotype.Service;

@Service
public class AccountingPeriodService {

    private static final DateTimeFormatter PERIOD_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM").withZone(ZoneOffset.UTC);

    private final AccountingPeriodRepository periodRepository;

    AccountingPeriodService(AccountingPeriodRepository periodRepository) {
        this.periodRepository = periodRepository;
    }

    public boolean isClosed(String tenantId, Instant postingDate) {
        String periodKey = PERIOD_FORMAT.format(postingDate == null ? Instant.now() : postingDate);
        return periodRepository.findByTenantIdAndPeriod(tenantId, periodKey)
                .map(period -> "closed".equals(period.getStatus()))
                .orElse(false);
    }

    public boolean isClosed(String tenantId, LocalDate postingDate) {
        String periodKey = postingDate == null ? periodKey((Instant) null) : postingDate.toString().substring(0, 7);
        return periodRepository.findByTenantIdAndPeriod(tenantId, periodKey)
                .map(period -> "closed".equals(period.getStatus()))
                .orElse(false);
    }

    public String periodKey(Instant postingDate) {
        return PERIOD_FORMAT.format(postingDate == null ? Instant.now() : postingDate);
    }

    public String periodKey(LocalDate postingDate) {
        return postingDate == null ? periodKey((Instant) null) : postingDate.toString().substring(0, 7);
    }
}
