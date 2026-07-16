package com.methaltech.sacco.accounting;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.finance.FinancialTransactionRepository;
import com.methaltech.sacco.governance.GovernanceResolutionRepository;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.loan.Loan;
import com.methaltech.sacco.loan.LoanRepaymentRepository;
import com.methaltech.sacco.loan.LoanRepository;
import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberRepository;
import com.methaltech.sacco.tenant.TenantResponse;
import com.methaltech.sacco.tenant.TenantService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Period;
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
    private final GovernanceResolutionRepository resolutionRepository;
    private final AuthService authService;

    @GetMapping
    ResponseEntity<?> getRegulatoryReport(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId,
            @RequestParam(name = "period", required = false) String period) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        List<TenantResponse> tenants = reportTenants(currentSession, requestedTenantId);
        if (tenants == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access regulatory reports for another tenant."));
        }

        List<RegulatoryTenantReport> reports = tenants.stream()
                .map(tenant -> buildTenantReport(tenant.id(), tenant.name()))
                .toList();
        RegulatoryReportResponse response = RegulatoryReportResponse.builder()
                .generatedAt(Instant.now())
                .period(period == null || period.isBlank() ? LocalDate.now().toString().substring(0, 7) : period.trim())
                .reports(reports)
                .consolidated(consolidate(reports))
                .csv(csv(reports))
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
        int parPercent = percent(loansAtRisk, loanPortfolio);
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
        BigDecimal assetNetBookValue = activeAssets.stream().map(this::netBookValue).reduce(BigDecimal.ZERO, BigDecimal::add);

        int journalEntries = transactionRepository.findByTenantIdOrderByCreatedAtDesc(tenantId)
                .stream()
                .filter(transaction -> "posted".equals(transaction.getStatus()))
                .toList()
                .size()
                + (int) loanRepository.findByTenantIdOrderByCreatedAtDesc(tenantId).stream().filter(loan -> loan.getDisbursedAt() != null).count()
                + repaymentRepository.findAll().stream().filter(repayment -> repayment.getTenantId().equals(tenantId)).toList().size()
                + expenseRepository.findByTenantIdOrderByExpenseDateDescCreatedAtDesc(tenantId).stream().filter(expense -> "posted".equals(expense.getStatus())).toList().size()
                + activeAssets.size()
                + (int) activeAssets.stream().filter(asset -> accumulatedDepreciation(asset).compareTo(BigDecimal.ZERO) > 0).count();
        int reconciliationExceptions = reconciliationExceptions(tenantId);

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
                .openComplaints(0)
                .openResolutions((int) resolutionRepository.countByTenantIdAndStatusNot(tenantId, "closed"))
                .complianceStatus(reconciliationExceptions == 0 ? "clear" : "review")
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
                                repaymentRepository.findAll()
                                        .stream()
                                        .filter(repayment -> repayment.getTenantId().equals(tenantId))
                                        .map(repayment -> accountForChannel(repayment.getChannel()) + "|" + repayment.getReference() + "|" + repayment.getAmount()),
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
            case "bank" -> "1010";
            default -> "1010";
        };
    }

    private RegulatoryTenantReport consolidate(List<RegulatoryTenantReport> reports) {
        BigDecimal loanPortfolio = reports.stream().map(RegulatoryTenantReport::getLoanPortfolio).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal loansAtRisk = reports.stream().map(RegulatoryTenantReport::getLoansAtRisk).reduce(BigDecimal.ZERO, BigDecimal::add);
        int reconciliationExceptions = reports.stream().mapToInt(RegulatoryTenantReport::getReconciliationExceptions).sum();
        int unbalanced = reports.stream().mapToInt(RegulatoryTenantReport::getUnbalancedJournalEntries).sum();
        return RegulatoryTenantReport.builder()
                .tenantId("consolidated")
                .tenantName("Consolidated")
                .memberCount(reports.stream().mapToInt(RegulatoryTenantReport::getMemberCount).sum())
                .activeMembers(reports.stream().mapToInt(RegulatoryTenantReport::getActiveMembers).sum())
                .savings(reports.stream().map(RegulatoryTenantReport::getSavings).reduce(BigDecimal.ZERO, BigDecimal::add))
                .shares(reports.stream().map(RegulatoryTenantReport::getShares).reduce(BigDecimal.ZERO, BigDecimal::add))
                .welfare(reports.stream().map(RegulatoryTenantReport::getWelfare).reduce(BigDecimal.ZERO, BigDecimal::add))
                .loanPortfolio(loanPortfolio)
                .activeLoans(reports.stream().mapToInt(RegulatoryTenantReport::getActiveLoans).sum())
                .loansAtRisk(loansAtRisk)
                .parPercent(percent(loansAtRisk, loanPortfolio))
                .expenseTotal(reports.stream().map(RegulatoryTenantReport::getExpenseTotal).reduce(BigDecimal.ZERO, BigDecimal::add))
                .assetCost(reports.stream().map(RegulatoryTenantReport::getAssetCost).reduce(BigDecimal.ZERO, BigDecimal::add))
                .assetNetBookValue(reports.stream().map(RegulatoryTenantReport::getAssetNetBookValue).reduce(BigDecimal.ZERO, BigDecimal::add))
                .journalEntries(reports.stream().mapToInt(RegulatoryTenantReport::getJournalEntries).sum())
                .unbalancedJournalEntries(unbalanced)
                .reconciliationExceptions(reconciliationExceptions)
                .openComplaints(0)
                .openResolutions(reports.stream().mapToInt(RegulatoryTenantReport::getOpenResolutions).sum())
                .complianceStatus(unbalanced == 0 && reconciliationExceptions == 0 ? "clear" : "review")
                .build();
    }

    private int percent(BigDecimal numerator, BigDecimal denominator) {
        if (denominator.compareTo(BigDecimal.ZERO) == 0) return 0;
        return numerator.multiply(BigDecimal.valueOf(100))
                .divide(denominator, 0, RoundingMode.HALF_UP)
                .intValue();
    }

    private BigDecimal netBookValue(Asset asset) {
        return asset.getCost().subtract(accumulatedDepreciation(asset)).max(asset.getSalvageValue());
    }

    private BigDecimal accumulatedDepreciation(Asset asset) {
        if (!"active".equals(asset.getStatus()) || asset.getDepreciationStartDate() == null) return BigDecimal.ZERO;
        LocalDate today = LocalDate.now();
        LocalDate start = asset.getDepreciationStartDate().withDayOfMonth(1);
        if (start.isAfter(today)) return BigDecimal.ZERO;
        LocalDate currentMonth = today.withDayOfMonth(1);
        int elapsedMonths = (int) Period.between(start, currentMonth).toTotalMonths() + 1;
        int depreciatedMonths = Math.min(elapsedMonths, asset.getUsefulLifeMonths());
        BigDecimal depreciableAmount = asset.getCost().subtract(asset.getSalvageValue());
        return depreciableAmount
                .multiply(BigDecimal.valueOf(depreciatedMonths))
                .divide(BigDecimal.valueOf(asset.getUsefulLifeMonths()), 2, RoundingMode.HALF_UP);
    }

    private String csv(List<RegulatoryTenantReport> reports) {
        String header = "\"tenant\",\"members\",\"active_members\",\"savings\",\"shares\",\"welfare\",\"loan_portfolio\",\"active_loans\",\"expenses\",\"fixed_assets\",\"net_assets\",\"par_percent\",\"reconciliation_exceptions\",\"open_complaints\",\"open_resolutions\",\"compliance_status\"";
        List<String> rows = reports.stream()
                .map(report -> csvRow(List.of(
                        report.getTenantName(),
                        report.getMemberCount(),
                        report.getActiveMembers(),
                        report.getSavings(),
                        report.getShares(),
                        report.getWelfare(),
                        report.getLoanPortfolio(),
                        report.getActiveLoans(),
                        report.getExpenseTotal(),
                        report.getAssetCost(),
                        report.getAssetNetBookValue(),
                        report.getParPercent(),
                        report.getReconciliationExceptions(),
                        report.getOpenComplaints(),
                        report.getOpenResolutions(),
                        report.getComplianceStatus())))
                .toList();
        return java.util.stream.Stream.concat(java.util.stream.Stream.of(header), rows.stream())
                .collect(java.util.stream.Collectors.joining("\n"));
    }

    private String csvRow(List<?> values) {
        return values.stream()
                .map(value -> "\"" + String.valueOf(value).replace("\"", "\"\"") + "\"")
                .collect(java.util.stream.Collectors.joining(","));
    }
}
