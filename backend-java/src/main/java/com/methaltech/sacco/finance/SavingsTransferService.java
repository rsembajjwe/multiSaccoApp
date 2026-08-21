package com.methaltech.sacco.finance;

import com.methaltech.sacco.loan.Loan;
import com.methaltech.sacco.loan.LoanRepository;
import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberFundBalanceService;
import com.methaltech.sacco.member.MemberRepository;
import com.methaltech.sacco.notification.NotificationService;
import java.math.BigDecimal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Applies a posted savings transfer atomically: it debits the source member's savings (both the member
 * balance and the per-fund ledger) and credits the chosen destination. Supported destinations: the
 * member's own fund (shares/welfare/custom), their loan repayment, a SACCO income/fee account (debit only),
 * or another member's savings. Balance sufficiency is enforced before any mutation.
 */
@Service
public class SavingsTransferService {

    private final MemberRepository memberRepository;
    private final MemberFundBalanceService memberFundBalanceService;
    private final LoanRepository loanRepository;
    private final SavingsTransferRepository transferRepository;
    private final NotificationService notificationService;

    SavingsTransferService(
            MemberRepository memberRepository,
            MemberFundBalanceService memberFundBalanceService,
            LoanRepository loanRepository,
            SavingsTransferRepository transferRepository,
            NotificationService notificationService) {
        this.memberRepository = memberRepository;
        this.memberFundBalanceService = memberFundBalanceService;
        this.loanRepository = loanRepository;
        this.transferRepository = transferRepository;
        this.notificationService = notificationService;
    }

    /** Applies the money movement, marks the transfer posted, and saves it — all in one transaction. */
    @Transactional
    public SavingsTransfer post(SavingsTransfer transfer, String decidedByUserId) {
        apply(transfer);
        transfer.post(decidedByUserId);
        return transferRepository.save(transfer);
    }

    /** Reverses a posted transfer by mirroring the original movement, then marks it reversed. */
    @Transactional
    public SavingsTransfer reverse(SavingsTransfer transfer, String reason) {
        if (!"posted".equals(transfer.getStatus())) {
            throw new SavingsTransferException(409, "TRANSFER_NOT_POSTED", "Only a posted transfer can be reversed.");
        }
        try {
            applyReversal(transfer);
        } catch (SavingsTransferException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw new SavingsTransferException(409, "REVERSAL_NOT_POSSIBLE", "Reversal failed (balances may have since changed): " + exception.getMessage());
        }
        transfer.markReversed(reason);
        return transferRepository.save(transfer);
    }

    private void applyReversal(SavingsTransfer transfer) {
        String tenantId = transfer.getTenantId();
        BigDecimal amount = transfer.getAmount();
        Member source = memberRepository.findById(transfer.getSourceMemberId())
                .filter(member -> tenantId.equals(member.getTenantId()))
                .orElseThrow(() -> new SavingsTransferException(404, "SOURCE_MEMBER_NOT_FOUND", "Source member was not found."));
        // Restore the source member's savings.
        source.applyReversal("withdrawal", amount);
        memberFundBalanceService.applyReversal(tenantId, source.getId(), "withdrawal", amount);

        switch (transfer.getDestinationType()) {
            case "own_fund" -> reverseOwnFund(source, transfer.getDestinationFundCode(), amount);
            case "another_member" -> reverseAnotherMember(tenantId, transfer.getDestinationMemberId(), amount);
            case "loan_repayment" -> reverseLoan(tenantId, transfer.getLoanId(), amount);
            case "sacco_income" -> { /* no member credit to unwind */ }
            default -> { /* nothing */ }
        }
        memberRepository.save(source);
    }

    private void reverseOwnFund(Member source, String fundCode, BigDecimal amount) {
        if ("shares".equals(fundCode)) {
            source.applyReversal("share_purchase", amount);
            memberFundBalanceService.applyReversal(source.getTenantId(), source.getId(), "share_purchase", amount);
        } else if ("welfare".equals(fundCode)) {
            source.applyReversal("welfare_contribution", amount);
            memberFundBalanceService.applyReversal(source.getTenantId(), source.getId(), "welfare_contribution", amount);
        } else if (fundCode != null && !fundCode.isBlank()) {
            memberFundBalanceService.creditFund(source.getTenantId(), source.getId(), fundCode, amount.negate());
        }
    }

    private void reverseAnotherMember(String tenantId, String destinationMemberId, BigDecimal amount) {
        Member destination = memberRepository.findById(destinationMemberId == null ? "" : destinationMemberId)
                .filter(member -> tenantId.equals(member.getTenantId()))
                .orElseThrow(() -> new SavingsTransferException(404, "DESTINATION_MEMBER_NOT_FOUND", "Destination member was not found."));
        destination.applyReversal("savings_deposit", amount);
        memberRepository.save(destination);
        memberFundBalanceService.applyReversal(tenantId, destination.getId(), "savings_deposit", amount);
    }

    private void reverseLoan(String tenantId, String loanId, BigDecimal amount) {
        Loan loan = loanRepository.findById(loanId == null ? "" : loanId)
                .filter(candidate -> tenantId.equals(candidate.getTenantId()))
                .orElseThrow(() -> new SavingsTransferException(404, "LOAN_NOT_FOUND", "Loan was not found."));
        loan.recordRepayment(amount.negate());
        loanRepository.save(loan);
    }

    void apply(SavingsTransfer transfer) {
        String tenantId = transfer.getTenantId();
        BigDecimal amount = transfer.getAmount();
        Member source = memberRepository.findById(transfer.getSourceMemberId())
                .filter(member -> tenantId.equals(member.getTenantId()))
                .orElseThrow(() -> new SavingsTransferException(404, "SOURCE_MEMBER_NOT_FOUND", "Source member was not found."));
        if (!source.hasEnoughSavings(amount)) {
            throw new SavingsTransferException(409, "INSUFFICIENT_SAVINGS", "The member's savings balance is too low for this transfer.");
        }

        // Debit the source member's savings (member balance + fund ledger).
        source.applyPostedTransaction("withdrawal", amount);
        memberFundBalanceService.applyPosted(tenantId, source.getId(), "withdrawal", amount);

        switch (transfer.getDestinationType()) {
            case "own_fund" -> creditOwnFund(source, transfer.getDestinationFundCode(), amount);
            case "another_member" -> creditAnotherMember(tenantId, transfer.getDestinationMemberId(), amount);
            case "loan_repayment" -> applyToLoan(tenantId, transfer.getLoanId(), amount);
            case "sacco_income" -> { /* debit only: recorded as SACCO income on the transfer */ }
            default -> throw new SavingsTransferException(400, "INVALID_DESTINATION", "Unsupported transfer destination.");
        }
        memberRepository.save(source);
        // Transparency: the affected member is told their savings were moved.
        notificationService.notifySavingsMovement(source, amount, true, transfer.getReason());
    }

    private void creditOwnFund(Member source, String fundCode, BigDecimal amount) {
        if (fundCode == null || fundCode.isBlank() || "savings".equals(fundCode)) {
            throw new SavingsTransferException(400, "INVALID_DESTINATION_FUND", "Choose a destination fund other than savings.");
        }
        if ("shares".equals(fundCode)) {
            source.applyPostedTransaction("share_purchase", amount);
            memberFundBalanceService.applyPosted(source.getTenantId(), source.getId(), "share_purchase", amount);
        } else if ("welfare".equals(fundCode)) {
            source.applyPostedTransaction("welfare_contribution", amount);
            memberFundBalanceService.applyPosted(source.getTenantId(), source.getId(), "welfare_contribution", amount);
        } else {
            // Custom fund types live only in the ledger.
            memberFundBalanceService.creditFund(source.getTenantId(), source.getId(), fundCode, amount);
        }
    }

    private void creditAnotherMember(String tenantId, String destinationMemberId, BigDecimal amount) {
        Member destination = memberRepository.findById(destinationMemberId == null ? "" : destinationMemberId)
                .filter(member -> tenantId.equals(member.getTenantId()))
                .orElseThrow(() -> new SavingsTransferException(404, "DESTINATION_MEMBER_NOT_FOUND", "Destination member was not found in this SACCO."));
        destination.applyPostedTransaction("savings_deposit", amount);
        memberRepository.save(destination);
        memberFundBalanceService.applyPosted(tenantId, destination.getId(), "savings_deposit", amount);
        notificationService.notifySavingsMovement(destination, amount, false, "Transferred from another member.");
    }

    private void applyToLoan(String tenantId, String loanId, BigDecimal amount) {
        Loan loan = loanRepository.findById(loanId == null ? "" : loanId)
                .filter(candidate -> tenantId.equals(candidate.getTenantId()))
                .orElseThrow(() -> new SavingsTransferException(404, "LOAN_NOT_FOUND", "Loan was not found in this SACCO."));
        loan.recordRepayment(amount);
        loanRepository.save(loan);
    }
}
