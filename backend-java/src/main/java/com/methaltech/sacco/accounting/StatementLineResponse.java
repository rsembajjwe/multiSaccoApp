package com.methaltech.sacco.accounting;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

record StatementLineResponse(
        String id,
        String tenantId,
        String accountCode,
        String channel,
        BigDecimal amount,
        String externalReference,
        String description,
        LocalDate statementDate,
        String importedByUserId,
        Instant createdAt,
        Instant updatedAt,
        String suggestedCollectionAccountId,
        String suggestedCollectionAccount,
        String collectionAccountId,
        String collectionAccount) {

    static StatementLineResponse from(StatementLine line) {
        return from(line, null, null);
    }

    /** Reconciliation view: {@code suggested} is the heuristic (account-number) match, or null. */
    static StatementLineResponse from(StatementLine line, com.methaltech.sacco.tenant.SaccoPaymentAccount suggested) {
        return from(line, suggested, null);
    }

    /**
     * Reconciliation view. {@code suggested} is the heuristic (account-number) match; {@code confirmed} is
     * the account a staff member persisted on the line (may differ from, and takes precedence over, the
     * suggestion). Either may be null.
     */
    static StatementLineResponse from(
            StatementLine line,
            com.methaltech.sacco.tenant.SaccoPaymentAccount suggested,
            com.methaltech.sacco.tenant.SaccoPaymentAccount confirmed) {
        return new StatementLineResponse(
                line.getId(),
                line.getTenantId(),
                line.getAccountCode(),
                line.getChannel(),
                line.getAmount(),
                line.getExternalReference(),
                line.getDescription(),
                line.getStatementDate(),
                line.getImportedByUserId(),
                line.getCreatedAt(),
                line.getUpdatedAt(),
                suggested == null ? null : suggested.getId(),
                suggested == null ? null : collectionAccountLabel(suggested),
                line.getCollectionAccountId(),
                confirmed == null ? null : collectionAccountLabel(confirmed));
    }

    private static String collectionAccountLabel(com.methaltech.sacco.tenant.SaccoPaymentAccount account) {
        String title = account.isBank()
                ? (account.getBankName() == null || account.getBankName().isBlank() ? "Bank" : account.getBankName())
                : String.valueOf(account.getNetwork() == null ? "Mobile money" : account.getNetwork()).toUpperCase(java.util.Locale.ROOT);
        return title + " " + account.getAccountNumber();
    }
}
