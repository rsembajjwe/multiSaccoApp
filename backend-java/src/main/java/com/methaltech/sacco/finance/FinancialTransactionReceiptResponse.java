package com.methaltech.sacco.finance;

import com.methaltech.sacco.branch.Branch;
import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.tenant.TenantResponse;
import java.math.BigDecimal;
import java.time.Instant;

record FinancialTransactionReceiptResponse(
        String receiptNo,
        String tenantId,
        String tenantName,
        String tenantRegistrationNo,
        String branchId,
        String branchName,
        String memberId,
        String membershipNo,
        String memberName,
        String transactionId,
        String transactionType,
        String channel,
        BigDecimal amount,
        String reference,
        String narration,
        String postedByUserId,
        Instant postedAt,
        Instant issuedAt,
        String printableText) {

    static FinancialTransactionReceiptResponse from(
            FinancialTransaction transaction,
            TenantResponse tenant,
            Branch branch,
            Member member,
            Instant issuedAt) {
        String receiptNo = "RCT-" + transaction.getReference();
        String printableText = """
                %s
                Receipt: %s
                Member: %s (%s)
                Branch: %s
                Transaction: %s via %s
                Amount: UGX %s
                Reference: %s
                Posted at: %s
                """.formatted(
                tenant.name(),
                receiptNo,
                member.getFullName(),
                member.getMembershipNo(),
                branch.getName(),
                transaction.getType(),
                transaction.getChannel(),
                transaction.getAmount().toPlainString(),
                transaction.getReference(),
                transaction.getPostedAt());
        return new FinancialTransactionReceiptResponse(
                receiptNo,
                transaction.getTenantId(),
                tenant.name(),
                tenant.registrationNo(),
                transaction.getBranchId(),
                branch.getName(),
                transaction.getMemberId(),
                member.getMembershipNo(),
                member.getFullName(),
                transaction.getId(),
                transaction.getType(),
                transaction.getChannel(),
                transaction.getAmount(),
                transaction.getReference(),
                transaction.getNarration(),
                transaction.getCheckerUserId(),
                transaction.getPostedAt(),
                issuedAt,
                printableText);
    }
}
