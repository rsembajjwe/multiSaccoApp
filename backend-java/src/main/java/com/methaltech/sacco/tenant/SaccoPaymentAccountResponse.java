package com.methaltech.sacco.tenant;

import java.time.Instant;

/**
 * A SACCO collection account as returned to staff/platform. The member-facing view uses only the
 * display fields (channel, network, account name/number, bank details, instructions).
 */
public record SaccoPaymentAccountResponse(
        String id,
        String tenantId,
        String channel,
        String network,
        String accountName,
        String accountNumber,
        String bankName,
        String branch,
        String swiftCode,
        String instructions,
        boolean active,
        Instant createdAt,
        Instant updatedAt) {

    public static SaccoPaymentAccountResponse from(SaccoPaymentAccount account) {
        return new SaccoPaymentAccountResponse(
                account.getId(),
                account.getTenantId(),
                account.getChannel(),
                account.getNetwork(),
                account.getAccountName(),
                account.getAccountNumber(),
                account.getBankName(),
                account.getBranch(),
                account.getSwiftCode(),
                account.getInstructions(),
                account.isActive(),
                account.getCreatedAt(),
                account.getUpdatedAt());
    }
}
