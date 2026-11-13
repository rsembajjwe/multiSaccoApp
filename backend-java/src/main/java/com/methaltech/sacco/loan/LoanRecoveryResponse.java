package com.methaltech.sacco.loan;

import com.methaltech.sacco.member.Member;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

record LoanRecoveryResponse(
        String id,
        String tenantId,
        String loanId,
        String borrowerMemberId,
        String borrowerName,
        String reference,
        String status,
        String reason,
        String recoveryMethod,
        String noticeReference,
        LocalDate noticeServedAt,
        LocalDate graceEndsAt,
        boolean includeGuarantors,
        BigDecimal outstandingAtProposal,
        BigDecimal borrowerSavingsProposed,
        BigDecimal guarantorSavingsProposed,
        BigDecimal totalProposed,
        BigDecimal remainingAfterProposal,
        String makerUserId,
        String checkerUserId,
        String decisionReason,
        Instant submittedAt,
        Instant decidedAt,
        Instant postedAt,
        Instant createdAt,
        List<AllocationResponse> allocations) {

    static LoanRecoveryResponse from(
            LoanRecoveryCase recoveryCase,
            List<LoanRecoveryAllocation> allocations,
            Map<String, Member> members) {
        Member borrower = members.get(recoveryCase.getBorrowerMemberId());
        return new LoanRecoveryResponse(
                recoveryCase.getId(), recoveryCase.getTenantId(), recoveryCase.getLoanId(),
                recoveryCase.getBorrowerMemberId(), borrower == null ? "Unknown member" : borrower.getFullName(),
                recoveryCase.getReference(), recoveryCase.getStatus(), recoveryCase.getReason(),
                recoveryCase.getRecoveryMethod(),
                recoveryCase.getNoticeReference(), recoveryCase.getNoticeServedAt(), recoveryCase.getGraceEndsAt(),
                recoveryCase.isIncludeGuarantors(), recoveryCase.getOutstandingAtProposal(),
                recoveryCase.getBorrowerSavingsProposed(), recoveryCase.getGuarantorSavingsProposed(),
                recoveryCase.getTotalProposed(), recoveryCase.getRemainingAfterProposal(),
                recoveryCase.getMakerUserId(), recoveryCase.getCheckerUserId(), recoveryCase.getDecisionReason(),
                recoveryCase.getSubmittedAt(), recoveryCase.getDecidedAt(), recoveryCase.getPostedAt(),
                recoveryCase.getCreatedAt(), allocations.stream().map(allocation -> {
                    Member source = members.get(allocation.getSourceMemberId());
                    return new AllocationResponse(
                            allocation.getId(), allocation.getSourceMemberId(),
                            source == null ? "Unknown member" : source.getFullName(),
                            source == null ? "" : source.getMembershipNo(), allocation.getSourceType(),
                            allocation.getGuarantorId(), allocation.getAmount(),
                            allocation.getAvailableSavingsAtProposal(), allocation.getGuaranteeLimitAtProposal(),
                            allocation.getStatus(), allocation.getFinancialTransactionId(),
                            allocation.getLoanRepaymentId(), allocation.getPostedAt());
                }).toList());
    }

    record AllocationResponse(
            String id,
            String sourceMemberId,
            String sourceMemberName,
            String sourceMembershipNo,
            String sourceType,
            String guarantorId,
            BigDecimal amount,
            BigDecimal availableSavingsAtProposal,
            BigDecimal guaranteeLimitAtProposal,
            String status,
            String financialTransactionId,
            String loanRepaymentId,
            Instant postedAt) {}
}
