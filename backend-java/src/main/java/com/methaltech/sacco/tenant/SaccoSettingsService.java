package com.methaltech.sacco.tenant;

import java.math.BigDecimal;
import org.springframework.stereotype.Service;

@Service
public class SaccoSettingsService {

    private static final BigDecimal DEFAULT_LOAN_INTEREST_RATE = BigDecimal.valueOf(1.5000);

    private final SaccoProfileRepository profileRepository;

    SaccoSettingsService(SaccoProfileRepository profileRepository) {
        this.profileRepository = profileRepository;
    }

    public BigDecimal loanInterestRateForTenant(String tenantId) {
        if (tenantId == null || tenantId.isBlank()) return DEFAULT_LOAN_INTEREST_RATE;
        return profileRepository.findByTenantId(tenantId)
                .map(SaccoProfile::getLoanInterestRate)
                .filter(rate -> rate.compareTo(BigDecimal.ZERO) >= 0)
                .orElse(DEFAULT_LOAN_INTEREST_RATE);
    }
}
