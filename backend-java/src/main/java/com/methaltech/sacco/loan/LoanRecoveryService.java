package com.methaltech.sacco.loan;

import com.methaltech.sacco.accounting.AccountingPeriodService;
import com.methaltech.sacco.finance.FinancialTransaction;
import com.methaltech.sacco.finance.FinancialTransactionRepository;
import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberFundBalanceService;
import com.methaltech.sacco.member.MemberRepository;
import com.methaltech.sacco.notification.NotificationService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
class LoanRecoveryService {

    private static final Set<String> OPEN_CASE_STATUSES = Set.of(
            LoanRecoveryCase.NOTICE_PERIOD, LoanRecoveryCase.PENDING_APPROVAL);

    private final LoanRepository loanRepository;
    private final LoanGuarantorRepository guarantorRepository;
    private final LoanRepaymentRepository repaymentRepository;
    private final LoanRepaymentScheduleRepository scheduleRepository;
    private final LoanRecoveryCaseRepository recoveryRepository;
    private final LoanRecoveryAllocationRepository allocationRepository;
    private final MemberRepository memberRepository;
    private final FinancialTransactionRepository transactionRepository;
    private final MemberFundBalanceService fundBalanceService;
    private final AccountingPeriodService periodService;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    List<LoanRecoveryResponse> list(String loanId) {
        return recoveryRepository.findByLoanIdOrderByCreatedAtDesc(loanId).stream()
                .map(this::response)
                .toList();
    }

    @Transactional
    LoanRecoveryResponse open(
            Loan loan,
            String reason,
            String recoveryMethod,
            String noticeReference,
            LocalDate noticeServedAt,
            boolean sendNotice,
            String makerUserId) {
        validateLoanForRecovery(loan);
        String method = required(recoveryMethod, "Recovery method").toLowerCase();
        if (!Set.of(LoanRecoveryCase.BORROWER_SAVINGS, LoanRecoveryCase.GUARANTOR_SHORTFALL).contains(method)) {
            throw error(400, "INVALID_RECOVERY_METHOD", "Recovery method must be borrower_savings or guarantor_shortfall.");
        }
        if (!sendNotice) {
            noticeReference = null;
            noticeServedAt = null;
        } else {
            noticeServedAt = noticeServedAt == null ? LocalDate.now() : noticeServedAt;
            if (noticeServedAt.isAfter(LocalDate.now())) {
                throw error(400, "INVALID_RECOVERY_NOTICE", "A recovery notice cannot be dated in the future.");
            }
        }
        if (recoveryRepository.existsByLoanIdAndStatusIn(loan.getId(), OPEN_CASE_STATUSES)) {
            throw error(409, "LOAN_RECOVERY_ALREADY_OPEN", "This loan already has an open recovery case.");
        }

        String reference = "LRC-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
        if (sendNotice && (noticeReference == null || noticeReference.isBlank())) {
            noticeReference = reference + "-NOTICE";
        }
        LoanRecoveryCase recoveryCase = recoveryRepository.save(new LoanRecoveryCase(
                "loan_recovery_" + UUID.randomUUID(), loan.getTenantId(), loan.getId(), loan.getMemberId(),
                reference,
                required(reason, "Recovery reason"), method, noticeReference,
                noticeServedAt, null, makerUserId));
        rebuildProposal(recoveryCase, loan);
        LoanRecoveryResponse posted = postRecovery(recoveryCase, makerUserId);
        if (sendNotice) notifyBorrowerNotice(recoveryCase);
        return posted;
    }

    @Transactional
    LoanRecoveryResponse submit(LoanRecoveryCase recoveryCase, String actorUserId) {
        if (!LoanRecoveryCase.NOTICE_PERIOD.equals(recoveryCase.getStatus())) {
            throw error(409, "RECOVERY_NOT_IN_NOTICE_PERIOD", "Only a case in its notice period can be submitted.");
        }
        if (!recoveryCase.getMakerUserId().equals(actorUserId)) {
            throw error(403, "RECOVERY_MAKER_REQUIRED", "Only the officer who opened this case can submit it.");
        }
        Loan loan = loanRepository.findById(recoveryCase.getLoanId())
                .orElseThrow(() -> error(404, "LOAN_NOT_FOUND", "Loan not found."));
        validateLoanForRecovery(loan);
        rebuildProposal(recoveryCase, loan);
        recoveryCase.submit();
        recoveryRepository.save(recoveryCase);
        return postRecovery(recoveryCase, actorUserId);
    }

    @Transactional
    LoanRecoveryResponse decide(LoanRecoveryCase recoveryCase, String decision, String reason, String checkerUserId) {
        if (!LoanRecoveryCase.PENDING_APPROVAL.equals(recoveryCase.getStatus())) {
            throw error(409, "RECOVERY_NOT_PENDING", "Only a pending recovery case can be decided.");
        }
        if ("rejected".equals(decision)) {
            recoveryCase.reject(checkerUserId, reason);
            return response(recoveryRepository.save(recoveryCase));
        }
        if (!"posted".equals(decision)) {
            throw error(400, "INVALID_RECOVERY_DECISION", "Decision must be posted or rejected.");
        }
        return postRecovery(recoveryCase, checkerUserId);
    }

    private LoanRecoveryResponse postRecovery(LoanRecoveryCase recoveryCase, String actorUserId) {
        if (!Set.of(LoanRecoveryCase.PENDING_APPROVAL, LoanRecoveryCase.NOTICE_PERIOD)
                .contains(recoveryCase.getStatus())) {
            throw error(409, "RECOVERY_NOT_PENDING", "Only an unposted recovery can be completed.");
        }
        if (periodService.isClosed(recoveryCase.getTenantId(), Instant.now())) {
            throw error(409, "ACCOUNTING_PERIOD_CLOSED", "The current accounting period is closed.");
        }

        Loan loan = loanRepository.findById(recoveryCase.getLoanId())
                .orElseThrow(() -> error(404, "LOAN_NOT_FOUND", "Loan not found."));
        if (loan.getBalance().compareTo(recoveryCase.getOutstandingAtProposal()) != 0) {
            throw error(409, "RECOVERY_PROPOSAL_STALE", "The loan balance changed after submission. Reject this case and create a new proposal.");
        }
        List<LoanRecoveryAllocation> allocations = allocationRepository
                .findByRecoveryCaseIdOrderByCreatedAtAsc(recoveryCase.getId());
        if (allocations.isEmpty()) {
            throw error(409, "NO_RECOVERABLE_SAVINGS", "No recoverable savings are available for this case.");
        }
        ensureNoActorConflict(actorUserId, allocations, loan.getMemberId());
        validateProposalCapacity(loan, allocations);

        BigDecimal posted = BigDecimal.ZERO;
        int sequence = 0;
        for (LoanRecoveryAllocation allocation : allocations) {
            sequence++;
            Member source = memberRepository.findById(allocation.getSourceMemberId())
                    .orElseThrow(() -> error(409, "RECOVERY_SOURCE_MISSING", "A recovery source member no longer exists."));
            source.applyPostedTransaction("withdrawal", allocation.getAmount());
            memberRepository.save(source);
            fundBalanceService.applyPosted(source.getTenantId(), source.getId(), "withdrawal", allocation.getAmount());

            String itemReference = recoveryCase.getReference() + "-" + String.format("%02d", sequence);
            FinancialTransaction debit = transactionRepository.save(FinancialTransaction.postedRecoveryDebit(
                    "txn_" + UUID.randomUUID(), recoveryCase.getTenantId(), source.getBranchId(), source.getId(),
                    allocation.getAmount(), itemReference,
                    "Loan recovery for " + recoveryCase.getReference(), recoveryCase.getMakerUserId(), actorUserId));
            LoanRepayment repayment = repaymentRepository.save(new LoanRepayment(
                    "repayment_" + UUID.randomUUID(), recoveryCase.getTenantId(), loan.getId(), loan.getMemberId(),
                    allocation.getAmount(), LoanRecoveryAllocation.BORROWER.equals(allocation.getSourceType())
                            ? "borrower_savings_offset" : "guarantor_savings_recovery",
                    itemReference, "Savings recovery " + recoveryCase.getReference(), actorUserId));
            allocation.markPosted(debit.getId(), repayment.getId());
            posted = posted.add(allocation.getAmount());
            notificationService.notifyLoanRecoveryPosted(
                    source, allocation.getAmount(), recoveryCase.getReference(), allocation.getSourceType());
        }

        loan.recordRepayment(posted);
        releaseSavingsHold(loan, posted);
        if ("paid".equals(loan.getStatus())) releaseGuarantees(loan);
        loanRepository.save(loan);
        allocationRepository.saveAll(allocations);
        recoveryCase.markPosted(actorUserId, loan.getBalance().compareTo(BigDecimal.ZERO) == 0);
        return response(recoveryRepository.save(recoveryCase));
    }

    LoanRecoveryResponse response(LoanRecoveryCase recoveryCase) {
        List<LoanRecoveryAllocation> allocations = allocationRepository
                .findByRecoveryCaseIdOrderByCreatedAtAsc(recoveryCase.getId());
        Map<String, Member> members = new HashMap<>();
        memberRepository.findAllById(allocations.stream().map(LoanRecoveryAllocation::getSourceMemberId).toList())
                .forEach(member -> members.put(member.getId(), member));
        memberRepository.findById(recoveryCase.getBorrowerMemberId())
                .ifPresent(member -> members.put(member.getId(), member));
        return LoanRecoveryResponse.from(recoveryCase, allocations, members);
    }

    private void rebuildProposal(LoanRecoveryCase recoveryCase, Loan loan) {
        allocationRepository.deleteByRecoveryCaseId(recoveryCase.getId());
        Member borrower = memberRepository.findById(loan.getMemberId())
                .orElseThrow(() -> error(404, "BORROWER_NOT_FOUND", "Borrower was not found."));
        BigDecimal remaining = loan.getBalance();
        BigDecimal borrowerCapacity = borrower.getSavingsBalance();
        BigDecimal borrowerAmount = remaining.min(borrowerCapacity).max(BigDecimal.ZERO);
        List<LoanRecoveryAllocation> allocations = new ArrayList<>();
        if (borrowerAmount.signum() > 0) {
            allocations.add(allocation(recoveryCase, borrower, LoanRecoveryAllocation.BORROWER, null,
                    borrowerAmount, borrowerCapacity, null));
            remaining = remaining.subtract(borrowerAmount);
        }

        BigDecimal guarantorAmount = BigDecimal.ZERO;
        if (recoveryCase.isIncludeGuarantors() && remaining.signum() > 0) {
            List<GuarantorCapacity> capacities = guarantorCapacities(loan);
            Map<String, BigDecimal> apportioned = apportion(remaining, capacities);
            for (GuarantorCapacity capacity : capacities) {
                BigDecimal amount = apportioned.getOrDefault(capacity.guarantor().getId(), BigDecimal.ZERO);
                if (amount.signum() <= 0) continue;
                allocations.add(allocation(recoveryCase, capacity.member(), LoanRecoveryAllocation.GUARANTOR,
                        capacity.guarantor().getId(), amount, capacity.member().getAvailableSavings(), capacity.remainingGuarantee()));
                guarantorAmount = guarantorAmount.add(amount);
            }
        }
        if (allocations.isEmpty()) {
            throw error(409, "NO_RECOVERABLE_SAVINGS", "Neither the borrower nor accepted guarantors have recoverable savings.");
        }
        allocationRepository.saveAll(allocations);
        recoveryCase.updateProposal(loan.getBalance(), borrowerAmount, guarantorAmount);
        recoveryRepository.save(recoveryCase);
    }

    private List<GuarantorCapacity> guarantorCapacities(Loan loan) {
        List<LoanGuarantor> accepted = new ArrayList<>(guarantorRepository.findByLoanIdOrderByCreatedAtDesc(loan.getId()).stream()
                .filter(item -> "accepted".equals(item.getStatus()) && item.getSignedAt() != null)
                .toList());
        Collections.reverse(accepted);
        List<GuarantorCapacity> capacities = new ArrayList<>();
        for (LoanGuarantor guarantor : accepted) {
            Member member = memberRepository.findById(guarantor.getMemberId()).orElse(null);
            if (member == null || !loan.getTenantId().equals(member.getTenantId())) continue;
            BigDecimal recovered = allocationRepository.postedAmountForGuarantor(loan.getId(), guarantor.getId());
            BigDecimal remainingGuarantee = guarantor.getGuaranteedAmount().subtract(recovered).max(BigDecimal.ZERO);
            BigDecimal capacity = member.getAvailableSavings().min(remainingGuarantee).max(BigDecimal.ZERO);
            if (capacity.signum() > 0) capacities.add(new GuarantorCapacity(guarantor, member, remainingGuarantee, capacity));
        }
        return capacities;
    }

    static Map<String, BigDecimal> apportion(BigDecimal requested, List<GuarantorCapacity> capacities) {
        Map<String, BigDecimal> result = new java.util.LinkedHashMap<>();
        BigDecimal totalCapacity = capacities.stream().map(GuarantorCapacity::capacity).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal target = requested.min(totalCapacity).setScale(2, RoundingMode.HALF_UP);
        if (target.signum() <= 0 || totalCapacity.signum() <= 0) return result;
        BigDecimal allocated = BigDecimal.ZERO;
        for (GuarantorCapacity item : capacities) {
            BigDecimal amount = target.multiply(item.capacity()).divide(totalCapacity, 2, RoundingMode.DOWN).min(item.capacity());
            result.put(item.guarantor().getId(), amount);
            allocated = allocated.add(amount);
        }
        BigDecimal remainder = target.subtract(allocated);
        for (GuarantorCapacity item : capacities) {
            if (remainder.signum() <= 0) break;
            BigDecimal current = result.get(item.guarantor().getId());
            BigDecimal room = item.capacity().subtract(current);
            BigDecimal increment = remainder.min(room).min(new BigDecimal("0.01"));
            if (increment.signum() > 0) {
                result.put(item.guarantor().getId(), current.add(increment));
                remainder = remainder.subtract(increment);
            }
        }
        return result;
    }

    private void validateLoanForRecovery(Loan loan) {
        if (!"active".equals(loan.getStatus()) || loan.getBalance().signum() <= 0) {
            throw error(409, "LOAN_NOT_RECOVERABLE", "Only an active loan with an outstanding balance can enter recovery.");
        }
        if (!isInArrearsOrMatured(loan)) {
            throw error(409, "LOAN_NOT_IN_ARREARS", "Recovery can only start after the loan is in arrears or has matured unpaid.");
        }
    }

    private boolean isInArrearsOrMatured(Loan loan) {
        List<LoanRepaymentSchedule> schedules = scheduleRepository.findByLoanIdOrderByInstallmentNoAsc(loan.getId());
        BigDecimal paid = repaymentRepository.totalAmountByLoanId(loan.getId());
        if (!schedules.isEmpty()) {
            BigDecimal due = schedules.stream()
                    .filter(item -> !item.getDueDate().isAfter(LocalDate.now()))
                    .map(LoanRepaymentSchedule::getTotalDue)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            return due.subtract(paid).signum() > 0;
        }
        if (loan.getDisbursedAt() == null) return false;
        LocalDate maturity = loan.getDisbursedAt().atZone(ZoneOffset.UTC).toLocalDate().plusMonths(loan.getRepaymentMonths());
        return !maturity.isAfter(LocalDate.now());
    }

    private void validateProposalCapacity(Loan loan, List<LoanRecoveryAllocation> allocations) {
        for (LoanRecoveryAllocation allocation : allocations) {
            Member member = memberRepository.findById(allocation.getSourceMemberId())
                    .orElseThrow(() -> error(409, "RECOVERY_SOURCE_MISSING", "A recovery source member no longer exists."));
            BigDecimal available = LoanRecoveryAllocation.BORROWER.equals(allocation.getSourceType())
                    ? member.getSavingsBalance() : member.getAvailableSavings();
            if (available.compareTo(allocation.getAmount()) < 0) {
                throw error(409, "RECOVERY_PROPOSAL_STALE", "A source savings balance changed after submission. Rebuild the recovery proposal.");
            }
            if (LoanRecoveryAllocation.GUARANTOR.equals(allocation.getSourceType())) {
                LoanGuarantor guarantor = guarantorRepository.findById(allocation.getGuarantorId()).orElse(null);
                if (guarantor == null || !"accepted".equals(guarantor.getStatus()) || guarantor.getSignedAt() == null) {
                    throw error(409, "GUARANTEE_NOT_ENFORCEABLE", "A proposed guarantee is no longer accepted and signed.");
                }
                BigDecimal remaining = guarantor.getGuaranteedAmount()
                        .subtract(allocationRepository.postedAmountForGuarantor(loan.getId(), guarantor.getId()))
                        .max(BigDecimal.ZERO);
                if (remaining.compareTo(allocation.getAmount()) < 0) {
                    throw error(409, "RECOVERY_PROPOSAL_STALE", "A guarantor's remaining accepted exposure changed.");
                }
            }
        }
    }

    private void ensureNoActorConflict(String actorUserId, List<LoanRecoveryAllocation> allocations, String borrowerId) {
        memberRepository.findFirstByLinkedUserId(actorUserId).ifPresent(linked -> {
            boolean conflict = linked.getId().equals(borrowerId)
                    || allocations.stream().anyMatch(item -> item.getSourceMemberId().equals(linked.getId()));
            if (conflict) throw error(409, "CONFLICT_OF_INTEREST", "An officer cannot post a recovery involving their own member account.");
        });
    }

    private void releaseSavingsHold(Loan loan, BigDecimal repaymentAmount) {
        BigDecimal release = "paid".equals(loan.getStatus()) ? loan.getSecuredHoldAmount() : repaymentAmount;
        BigDecimal released = loan.reduceSecuredHold(release);
        if (released.signum() > 0) {
            memberRepository.findById(loan.getMemberId()).ifPresent(member -> {
                member.releaseSavingsHold(released);
                memberRepository.save(member);
            });
        }
    }

    private void releaseGuarantees(Loan loan) {
        List<LoanGuarantor> guarantees = guarantorRepository.findByLoanIdOrderByCreatedAtDesc(loan.getId()).stream()
                .filter(item -> "accepted".equals(item.getStatus()))
                .toList();
        guarantees.forEach(LoanGuarantor::release);
        guarantorRepository.saveAll(guarantees);
    }

    private void notifyBorrowerNotice(LoanRecoveryCase recoveryCase) {
        memberRepository.findById(recoveryCase.getBorrowerMemberId()).ifPresent(member ->
                notificationService.notifyLoanRecoveryNotice(
                        member, recoveryCase.getReference(), recoveryCase.getTotalProposed()));
    }

    private LoanRecoveryAllocation allocation(
            LoanRecoveryCase recoveryCase, Member member, String sourceType, String guarantorId,
            BigDecimal amount, BigDecimal available, BigDecimal guaranteeLimit) {
        return new LoanRecoveryAllocation(
                "loan_recovery_allocation_" + UUID.randomUUID(), recoveryCase, member.getId(), sourceType,
                guarantorId, amount.setScale(2, RoundingMode.HALF_UP), available, guaranteeLimit);
    }

    private String required(String value, String label) {
        if (value == null || value.isBlank()) throw error(400, "RECOVERY_FIELD_REQUIRED", label + " is required.");
        return value.trim();
    }

    private LoanRecoveryException error(int status, String code, String message) {
        return new LoanRecoveryException(status, code, message);
    }

    record GuarantorCapacity(LoanGuarantor guarantor, Member member, BigDecimal remainingGuarantee, BigDecimal capacity) {}
}
