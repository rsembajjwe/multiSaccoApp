package com.methaltech.sacco.accounting;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.branch.Branch;
import com.methaltech.sacco.branch.BranchRepository;
import com.methaltech.sacco.complaint.ComplaintRepository;
import com.methaltech.sacco.finance.FinancialTransactionRepository;
import com.methaltech.sacco.governance.GovernanceResolutionRepository;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.loan.Loan;
import com.methaltech.sacco.loan.LoanRepaymentRepository;
import com.methaltech.sacco.loan.LoanRepository;
import com.methaltech.sacco.member.DataProtectionEvidence;
import com.methaltech.sacco.member.DataProtectionEvidenceService;
import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberRepository;
import com.methaltech.sacco.subscription.SubscriptionPaymentRepository;
import com.methaltech.sacco.tenant.TenantResponse;
import com.methaltech.sacco.tenant.TenantService;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/regulatory-report")
@RequiredArgsConstructor
class RegulatoryReportController {

    private final TenantService tenantService;
    private final MemberRepository memberRepository;
    private final LoanRepository loanRepository;
    private final FinancialTransactionRepository transactionRepository;
    private final LoanRepaymentRepository repaymentRepository;
    private final StatementLineRepository statementLineRepository;
    private final ExpenseRepository expenseRepository;
    private final AssetRepository assetRepository;
    private final ComplaintRepository complaintRepository;
    private final GovernanceResolutionRepository resolutionRepository;
    private final SubscriptionPaymentRepository subscriptionPaymentRepository;
    private final DataProtectionEvidenceService dataProtectionEvidenceService;
    private final AuthService authService;
    private final BranchRepository branchRepository;

    @GetMapping
    ResponseEntity<?> getRegulatoryReport(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId,
            @RequestParam(name = "period", required = false) String period) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "reports:view")) {
            return authService.permissionRequired("reports:view");
        }

        List<TenantResponse> tenants = reportTenants(currentSession, requestedTenantId);
        if (tenants == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access regulatory reports for another tenant."));
        }
        if (branchScoped(currentSession, tenants)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "BRANCH_ACCESS_DENIED", "Cannot access SACCO-wide regulatory reports from a branch-scoped account."));
        }

        List<RegulatoryTenantReport> reports = tenants.stream()
                .map(tenant -> buildTenantReport(tenant.id(), tenant.name()))
                .toList();
        RegulatoryReportResponse response = RegulatoryReportResponse.builder()
                .generatedAt(Instant.now())
                .period(period == null || period.isBlank() ? LocalDate.now().toString().substring(0, 7) : period.trim())
                .reports(reports)
                .consolidated(RegulatoryReportAssembler.consolidate(reports))
                .csv(RegulatoryReportAssembler.csv(reports))
                .build();

        return ResponseEntity.ok(ApiResponse.of(response));
    }

    private List<TenantResponse> reportTenants(AuthService.CurrentSession currentSession, String requestedTenantId) {
        if (authService.isPlatform(currentSession.user())) {
            if (requestedTenantId == null || requestedTenantId.isBlank()) return tenantService.findAllNonPlatform();
            return tenantService.findById(requestedTenantId.trim()).map(List::of).orElse(List.of());
        }
        String tenantId = currentSession.user().getTenantId();
        if (requestedTenantId != null && !requestedTenantId.isBlank() && !tenantId.equals(requestedTenantId.trim())) return null;
        return tenantService.findById(tenantId).map(List::of).orElse(List.of());
    }

    private boolean branchScoped(AuthService.CurrentSession currentSession, List<TenantResponse> tenants) {
        if (authService.isPlatform(currentSession.user()) || authService.hasPermission(currentSession.user(), "tenants:manage")) {
            return false;
        }
        return tenants.stream()
                .anyMatch(tenant -> !branchRepository.findByTenantIdAndManagerUserIdOrderByCodeAsc(tenant.id(), currentSession.user().getId())
                        .stream()
                        .map(Branch::getId)
                        .toList()
                        .isEmpty());
    }

    private RegulatoryTenantReport buildTenantReport(String tenantId, String tenantName) {
        List<Member> members = memberRepository.findByTenantIdOrderByMembershipNoAsc(tenantId);
        List<Member> activeMembers = members.stream().filter(member -> "active".equals(member.getStatus())).toList();
        BigDecimal savings = members.stream().map(Member::getSavingsBalance).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal shares = members.stream().map(Member::getSharesBalance).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal welfare = members.stream().map(Member::getWelfareBalance).reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Loan> activeLoans = loanRepository.findByTenantIdOrderByCreatedAtDesc(tenantId)
                .stream()
                .filter(loan -> "active".equals(loan.getStatus()))
                .toList();
        BigDecimal loanPortfolio = activeLoans.stream().map(Loan::getBalance).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal loansAtRisk = activeLoans.stream()
                .filter(loan -> loan.getDsr() >= 40)
                .map(Loan::getBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        int parPercent = RegulatoryReportAssembler.percent(loansAtRisk, loanPortfolio);
        BigDecimal expenseTotal = expenseRepository.findByTenantIdOrderByExpenseDateDescCreatedAtDesc(tenantId)
                .stream()
                .filter(expense -> "posted".equals(expense.getStatus()))
                .map(Expense::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        List<Asset> activeAssets = assetRepository.findByTenantIdOrderByPurchaseDateDescCreatedAtDesc(tenantId)
                .stream()
                .filter(asset -> "active".equals(asset.getStatus()))
                .toList();
        BigDecimal assetCost = activeAssets.stream().map(Asset::getCost).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal assetNetBookValue = activeAssets.stream().map(AssetValuation::netBookValue).reduce(BigDecimal.ZERO, BigDecimal::add);

        int journalEntries = transactionRepository.findByTenantIdOrderByCreatedAtDesc(tenantId)
                .stream()
                .filter(transaction -> "posted".equals(transaction.getStatus()))
                .toList()
                .size()
                + (int) loanRepository.findByTenantIdOrderByCreatedAtDesc(tenantId).stream().filter(loan -> loan.getDisbursedAt() != null).count()
                + repaymentRepository.findAll().stream().filter(repayment -> repayment.getTenantId().equals(tenantId)).toList().size()
                + subscriptionPaymentRepository.findByTenantIdOrderByReceivedAtDesc(tenantId).size()
                + expenseRepository.findByTenantIdOrderByExpenseDateDescCreatedAtDesc(tenantId).stream().filter(expense -> "posted".equals(expense.getStatus())).toList().size()
                + activeAssets.size()
                + (int) activeAssets.stream().filter(asset -> AssetValuation.accumulatedDepreciation(asset).compareTo(BigDecimal.ZERO) > 0).count();
        int reconciliationExceptions = reconciliationExceptions(tenantId);
        DataProtectionEvidence dataProtectionEvidence = dataProtectionEvidenceService.build(tenantId);

        return RegulatoryTenantReport.builder()
                .tenantId(tenantId)
                .tenantName(tenantName)
                .memberCount(members.size())
                .activeMembers(activeMembers.size())
                .savings(savings)
                .shares(shares)
                .welfare(welfare)
                .loanPortfolio(loanPortfolio)
                .activeLoans(activeLoans.size())
                .loansAtRisk(loansAtRisk)
                .parPercent(parPercent)
                .expenseTotal(expenseTotal)
                .assetCost(assetCost)
                .assetNetBookValue(assetNetBookValue)
                .journalEntries(journalEntries)
                .unbalancedJournalEntries(0)
                .reconciliationExceptions(reconciliationExceptions)
                .openComplaints((int) complaintRepository.countByTenantIdAndStatusNotIn(tenantId, List.of("resolved", "closed")))
                .openResolutions((int) resolutionRepository.countByTenantIdAndStatusNot(tenantId, "closed"))
                .dataProtectionEvidence(dataProtectionEvidence)
                .complianceStatus(reconciliationExceptions == 0 && "ready".equals(dataProtectionEvidence.evidenceStatus()) ? "clear" : "review")
                .build();
    }

    private int reconciliationExceptions(String tenantId) {
        Set<String> ledgerKeys = java.util.stream.Stream.concat(
                        java.util.stream.Stream.concat(
                                transactionRepository.findByTenantIdOrderByCreatedAtDesc(tenantId)
                                        .stream()
                                        .filter(transaction -> "posted".equals(transaction.getStatus()))
                                        .map(transaction -> accountForChannel(transaction.getChannel()) + "|" + transaction.getReference() + "|" + signedTransactionAmount(transaction)),
                                loanRepository.findByTenantIdOrderByCreatedAtDesc(tenantId)
                                        .stream()
                                        .filter(loan -> loan.getDisbursedAt() != null)
                                        .map(loan -> "1010|" + loan.getId() + "|" + loan.getAmount().negate())),
                        java.util.stream.Stream.concat(
                                java.util.stream.Stream.concat(
                                        repaymentRepository.findAll()
                                                .stream()
                                                .filter(repayment -> repayment.getTenantId().equals(tenantId))
                                                .map(repayment -> accountForChannel(repayment.getChannel()) + "|" + repayment.getReference() + "|" + repayment.getAmount()),
                                        subscriptionPaymentRepository.findByTenantIdOrderByReceivedAtDesc(tenantId)
                                                .stream()
                                                .map(payment -> accountForChannel(payment.getChannel()) + "|" + payment.getExternalReference() + "|" + payment.getAmount().negate())),
                                java.util.stream.Stream.concat(
                                        expenseRepository.findByTenantIdOrderByExpenseDateDescCreatedAtDesc(tenantId)
                                                .stream()
                                                .filter(expense -> "posted".equals(expense.getStatus()))
                                                .map(expense -> accountForChannel(expense.getChannel()) + "|" + expense.getReference() + "|" + expense.getAmount().negate()),
                                        assetRepository.findByTenantIdOrderByPurchaseDateDescCreatedAtDesc(tenantId)
                                                .stream()
                                                .filter(asset -> "active".equals(asset.getStatus()))
                                                .map(asset -> accountForChannel(asset.getChannel()) + "|" + asset.getReference() + "|" + asset.getCost().negate()))))
                .collect(java.util.stream.Collectors.toSet());

        List<StatementLine> statementLines = statementLineRepository.findByTenantIdOrderByStatementDateDescCreatedAtDesc(tenantId);
        long matched = statementLines.stream()
                .filter(line -> ledgerKeys.contains(line.getAccountCode() + "|" + line.getExternalReference() + "|" + line.getAmount()))
                .count();
        int unmatchedStatementLines = statementLines.size() - (int) matched;
        int unmatchedLedgerLines = ledgerKeys.size() - (int) matched;
        return unmatchedStatementLines + Math.max(unmatchedLedgerLines, 0);
    }

    private BigDecimal signedTransactionAmount(com.methaltech.sacco.finance.FinancialTransaction transaction) {
        return "withdrawal".equals(transaction.getType()) ? transaction.getAmount().negate() : transaction.getAmount();
    }

    private String accountForChannel(String channel) {
        return switch (channel) {
            case "cash" -> "1000";
            case "mobile_money" -> "1020";
            case "payroll_deduction", "payroll" -> "1030";
            case "bank", "manual" -> "1010";
            default -> "1010";
        };
    }

}
