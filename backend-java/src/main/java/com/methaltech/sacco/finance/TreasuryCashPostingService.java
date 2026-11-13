package com.methaltech.sacco.finance;

import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.User;
import com.methaltech.sacco.money.Money;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class TreasuryCashPostingService {

    private final TreasuryCashEntryRepository repository;
    private final AuditService auditService;

    public TreasuryCashPostingService(
            TreasuryCashEntryRepository repository,
            AuditService auditService) {
        this.repository = repository;
        this.auditService = auditService;
    }

    public void recordCollection(
            String tenantId,
            String memberId,
            BigDecimal amount,
            String reference,
            String description,
            User recordedBy,
            String remoteAddress) {
        record(
                tenantId,
                memberId,
                amount,
                reference,
                description,
                "collection",
                TreasuryCashEntry.IN,
                recordedBy,
                remoteAddress);
    }

    public void recordMemberPayout(
            String tenantId,
            String memberId,
            BigDecimal amount,
            String reference,
            String description,
            User recordedBy,
            String remoteAddress) {
        record(
                tenantId,
                memberId,
                amount,
                reference,
                description,
                "member_payout",
                TreasuryCashEntry.OUT,
                recordedBy,
                remoteAddress);
    }

    private void record(
            String tenantId,
            String memberId,
            BigDecimal amount,
            String reference,
            String description,
            String purpose,
            String direction,
            User recordedBy,
            String remoteAddress) {
        BigDecimal normalizedAmount = Money.normalize(amount);
        TreasuryCashEntry entry = repository.save(new TreasuryCashEntry(
                "cash_" + UUID.randomUUID(),
                tenantId,
                direction,
                purpose,
                normalizedAmount,
                reference,
                description,
                memberId,
                LocalDate.now(),
                recordedBy.getId()));
        auditService.record(
                tenantId,
                recordedBy,
                (TreasuryCashEntry.IN.equals(direction) ? "Cash in - " : "Cash out - ")
                        + purpose + " " + normalizedAmount,
                "treasury_cash_entry",
                entry.getId(),
                remoteAddress);
    }
}
