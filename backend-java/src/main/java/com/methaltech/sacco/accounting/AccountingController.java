package com.methaltech.sacco.accounting;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.finance.FinancialTransaction;
import com.methaltech.sacco.finance.FinancialTransactionRepository;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.loan.Loan;
import com.methaltech.sacco.loan.LoanRepayment;
import com.methaltech.sacco.loan.LoanRepaymentRepository;
import com.methaltech.sacco.loan.LoanRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
class AccountingController {

    private final ChartOfAccountRepository chartRepository;
    private final FinancialTransactionRepository transactionRepository;
    private final LoanRepository loanRepository;
    private final LoanRepaymentRepository repaymentRepository;
    private final AuthService authService;

    AccountingController(
            ChartOfAccountRepository chartRepository,
            FinancialTransactionRepository transactionRepository,
            LoanRepository loanRepository,
            LoanRepaymentRepository repaymentRepository,
            AuthService authService) {
        this.chartRepository = chartRepository;
        this.transactionRepository = transactionRepository;
        this.loanRepository = loanRepository;
        this.repaymentRepository = repaymentRepository;
        this.authService = authService;
    }

    @GetMapping("/chart-of-accounts")
    ResponseEntity<?> listChartOfAccounts(@RequestHeader(name = "Authorization", required = false) String authorization) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        return ResponseEntity.ok(ApiResponse.of(chartRepository.findAllByOrderByCodeAsc()
                .stream()
                .map(ChartOfAccountResponse::from)
                .toList()));
    }

    @GetMapping("/journal-entries")
    ResponseEntity<?> listJournalEntries(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null) return tenantAccessDenied();

        Map<String, ChartOfAccount> accounts = chartRepository.findAllByOrderByCodeAsc()
                .stream()
                .collect(java.util.stream.Collectors.toMap(ChartOfAccount::getCode, account -> account));

        List<JournalEntryResponse> entries = java.util.stream.Stream.concat(
                        java.util.stream.Stream.concat(
                                transactionJournalEntries(tenantId, currentSession, accounts).stream(),
                                loanDisbursementJournalEntries(tenantId, currentSession, accounts).stream()),
                        loanRepaymentJournalEntries(tenantId, currentSession, accounts).stream())
                .sorted(Comparator.comparing(JournalEntryResponse::postedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .toList();

        return ResponseEntity.ok(ApiResponse.of(entries));
    }

    private List<JournalEntryResponse> transactionJournalEntries(
            String tenantId,
            AuthService.CurrentSession currentSession,
            Map<String, ChartOfAccount> accounts) {
        List<FinancialTransaction> transactions = authService.isPlatform(currentSession.user()) && tenantId == null
                ? transactionRepository.findAllByOrderByTenantIdAscCreatedAtDesc()
                : transactionRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);

        return transactions.stream()
                .filter(transaction -> "posted".equals(transaction.getStatus()))
                .map(transaction -> {
                    String cashAccount = accountForChannel(transaction.getChannel());
                    List<JournalLineResponse> lines = "withdrawal".equals(transaction.getType())
                            ? List.of(
                                    line("2000", transaction.getAmount(), BigDecimal.ZERO, transaction.getMemberId(), accounts),
                                    line(cashAccount, BigDecimal.ZERO, transaction.getAmount(), transaction.getMemberId(), accounts))
                            : List.of(
                                    line(cashAccount, transaction.getAmount(), BigDecimal.ZERO, transaction.getMemberId(), accounts),
                                    line(accountForTransactionType(transaction.getType()), BigDecimal.ZERO, transaction.getAmount(), transaction.getMemberId(), accounts));
                    return journal(
                            "je_" + transaction.getId(),
                            transaction.getTenantId(),
                            "financial_transaction",
                            transaction.getId(),
                            transaction.getReference(),
                            transaction.getNarration() == null || transaction.getNarration().isBlank()
                                    ? "Posted " + transaction.getType().replace('_', ' ')
                                    : transaction.getNarration(),
                            transaction.getPostedAt() == null ? transaction.getUpdatedAt() : transaction.getPostedAt(),
                            lines);
                })
                .toList();
    }

    private List<JournalEntryResponse> loanDisbursementJournalEntries(
            String tenantId,
            AuthService.CurrentSession currentSession,
            Map<String, ChartOfAccount> accounts) {
        List<Loan> loans = authService.isPlatform(currentSession.user()) && tenantId == null
                ? loanRepository.findAllByOrderByTenantIdAscCreatedAtDesc()
                : loanRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);

        return loans.stream()
                .filter(loan -> loan.getDisbursedAt() != null)
                .map(loan -> journal(
                        "je_disbursement_" + loan.getId(),
                        loan.getTenantId(),
                        "loan_disbursement",
                        loan.getId(),
                        loan.getId(),
                        "Disbursed " + loan.getProduct(),
                        loan.getDisbursedAt(),
                        List.of(
                                line("1100", loan.getAmount(), BigDecimal.ZERO, loan.getMemberId(), accounts),
                                line("1010", BigDecimal.ZERO, loan.getAmount(), loan.getMemberId(), accounts))))
                .toList();
    }

    private List<JournalEntryResponse> loanRepaymentJournalEntries(
            String tenantId,
            AuthService.CurrentSession currentSession,
            Map<String, ChartOfAccount> accounts) {
        List<LoanRepayment> repayments = repaymentRepository.findAll();

        return repayments.stream()
                .filter(repayment -> authService.isPlatform(currentSession.user()) && tenantId == null
                        || repayment.getTenantId().equals(tenantId))
                .map(repayment -> journal(
                        "je_" + repayment.getId(),
                        repayment.getTenantId(),
                        "loan_repayment",
                        repayment.getId(),
                        repayment.getReference(),
                        repayment.getNarration() == null || repayment.getNarration().isBlank()
                                ? "Recorded loan repayment"
                                : repayment.getNarration(),
                        repayment.getReceivedAt(),
                        List.of(
                                line(accountForChannel(repayment.getChannel()), repayment.getAmount(), BigDecimal.ZERO, repayment.getMemberId(), accounts),
                                line("1100", BigDecimal.ZERO, repayment.getAmount(), repayment.getMemberId(), accounts))))
                .toList();
    }

    private JournalEntryResponse journal(
            String id,
            String tenantId,
            String sourceType,
            String sourceId,
            String reference,
            String description,
            Instant postedAt,
            List<JournalLineResponse> lines) {
        BigDecimal debitTotal = lines.stream().map(JournalLineResponse::debit).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal creditTotal = lines.stream().map(JournalLineResponse::credit).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new JournalEntryResponse(
                id,
                tenantId,
                sourceType,
                sourceId,
                reference,
                description,
                postedAt,
                debitTotal,
                creditTotal,
                debitTotal.compareTo(creditTotal) == 0,
                lines);
    }

    private JournalLineResponse line(
            String accountCode,
            BigDecimal debit,
            BigDecimal credit,
            String memberId,
            Map<String, ChartOfAccount> accounts) {
        ChartOfAccount account = accounts.get(accountCode);
        return new JournalLineResponse(
                accountCode,
                account == null ? accountCode : account.getName(),
                account == null ? "unknown" : account.getType(),
                memberId,
                debit,
                credit);
    }

    private String accountForChannel(String channel) {
        return switch (channel) {
            case "cash" -> "1000";
            case "mobile_money" -> "1020";
            case "payroll_deduction" -> "1030";
            case "bank" -> "1010";
            default -> "1010";
        };
    }

    private String accountForTransactionType(String type) {
        return switch (type) {
            case "share_purchase" -> "2100";
            case "welfare_contribution" -> "2200";
            case "savings_deposit", "withdrawal" -> "2000";
            default -> "2000";
        };
    }

    private String tenantScope(AuthService.CurrentSession currentSession, String requestedTenantId) {
        if (authService.isPlatform(currentSession.user()) && (requestedTenantId == null || requestedTenantId.isBlank())) {
            return null;
        }
        String tenantId = requestedTenantId == null || requestedTenantId.isBlank()
                ? currentSession.user().getTenantId()
                : requestedTenantId.trim();
        if (!authService.isPlatform(currentSession.user()) && !tenantId.equals(currentSession.user().getTenantId())) return null;
        return tenantId;
    }

    private ResponseEntity<ApiErrorResponse> tenantAccessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access accounting data for another tenant."));
    }
}
