package com.methaltech.sacco.accounting;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.finance.FinancialTransaction;
import com.methaltech.sacco.finance.FinancialTransactionRepository;
import com.methaltech.sacco.finance.WelfareClaim;
import com.methaltech.sacco.finance.WelfareClaimRepository;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.loan.Loan;
import com.methaltech.sacco.loan.LoanRepayment;
import com.methaltech.sacco.loan.LoanRepaymentRepository;
import com.methaltech.sacco.loan.LoanRepository;
import com.methaltech.sacco.subscription.SubscriptionPayment;
import com.methaltech.sacco.subscription.SubscriptionPaymentRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Period;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
class AccountingController {

    private static final Set<String> PERIOD_STATUSES = Set.of("open", "closed");
    private static final Set<String> STATEMENT_CHANNELS = Set.of("cash", "bank", "mobile_money", "payroll_deduction");
    private static final Set<String> CASH_ACCOUNTS = Set.of("1000", "1010", "1020", "1030");
    private static final Set<String> EXPENSE_CHANNELS = Set.of("mobile_money", "cash", "bank", "payroll_deduction");
    private static final Set<String> ASSET_CATEGORIES = Set.of("equipment", "furniture", "vehicle", "building", "technology", "other");

    private final AccountingPeriodRepository periodRepository;
    private final AccountingPeriodService periodService;
    private final ChartOfAccountRepository chartRepository;
    private final StatementLineRepository statementLineRepository;
    private final SupplierRepository supplierRepository;
    private final ExpenseRepository expenseRepository;
    private final AssetRepository assetRepository;
    private final FinancialTransactionRepository transactionRepository;
    private final WelfareClaimRepository welfareClaimRepository;
    private final LoanRepository loanRepository;
    private final LoanRepaymentRepository repaymentRepository;
    private final SubscriptionPaymentRepository subscriptionPaymentRepository;
    private final AuthService authService;
    private final AuditService auditService;

    AccountingController(
            AccountingPeriodRepository periodRepository,
            AccountingPeriodService periodService,
            ChartOfAccountRepository chartRepository,
            StatementLineRepository statementLineRepository,
            SupplierRepository supplierRepository,
            ExpenseRepository expenseRepository,
            AssetRepository assetRepository,
            FinancialTransactionRepository transactionRepository,
            WelfareClaimRepository welfareClaimRepository,
            LoanRepository loanRepository,
            LoanRepaymentRepository repaymentRepository,
            SubscriptionPaymentRepository subscriptionPaymentRepository,
            AuthService authService,
            AuditService auditService) {
        this.periodRepository = periodRepository;
        this.periodService = periodService;
        this.chartRepository = chartRepository;
        this.statementLineRepository = statementLineRepository;
        this.supplierRepository = supplierRepository;
        this.expenseRepository = expenseRepository;
        this.assetRepository = assetRepository;
        this.transactionRepository = transactionRepository;
        this.welfareClaimRepository = welfareClaimRepository;
        this.loanRepository = loanRepository;
        this.repaymentRepository = repaymentRepository;
        this.subscriptionPaymentRepository = subscriptionPaymentRepository;
        this.authService = authService;
        this.auditService = auditService;
    }

    @GetMapping("/accounting-periods")
    ResponseEntity<?> listAccountingPeriods(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "accounting:view")) {
            return authService.permissionRequired("accounting:view");
        }

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null) return tenantAccessDenied();

        List<AccountingPeriod> periods = authService.isPlatform(currentSession.user()) && requestedTenantId == null
                ? periodRepository.findAllByOrderByTenantIdAscPeriodDesc()
                : periodRepository.findByTenantIdOrderByPeriodDesc(tenantId);

        return ResponseEntity.ok(ApiResponse.of(periods.stream().map(AccountingPeriodResponse::from).toList()));
    }

    @PatchMapping("/accounting-periods/{periodId}/status")
    ResponseEntity<?> updateAccountingPeriodStatus(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String periodId,
            @Valid @RequestBody UpdateAccountingPeriodStatusRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "accounting:post")) {
            return authService.permissionRequired("accounting:post");
        }

        String status = body.status().trim();
        if (!PERIOD_STATUSES.contains(status)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_ACCOUNTING_PERIOD_STATUS", "Accounting period can only be open or closed."));
        }

        return periodRepository.findById(periodId)
                .<ResponseEntity<?>>map(period -> {
                    if (!canAccess(currentSession, period.getTenantId())) return tenantAccessDenied();
                    period.updateStatus(status, currentSession.user().getId());
                    AccountingPeriod saved = periodRepository.save(period);
                    auditService.record(
                            saved.getTenantId(),
                            currentSession.user(),
                            ("closed".equals(status) ? "Closed" : "Reopened") + " accounting period " + saved.getPeriod(),
                            "accounting_period",
                            saved.getId(),
                            request.getRemoteAddr());
                    return ResponseEntity.ok(ApiResponse.of(AccountingPeriodResponse.from(saved)));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "ACCOUNTING_PERIOD_NOT_FOUND", "Accounting period not found.")));
    }

    @GetMapping("/chart-of-accounts")
    ResponseEntity<?> listChartOfAccounts(@RequestHeader(name = "Authorization", required = false) String authorization) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "accounting:view")) {
            return authService.permissionRequired("accounting:view");
        }

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
        if (!authService.hasPermission(currentSession.user(), "accounting:view")) {
            return authService.permissionRequired("accounting:view");
        }

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null) return tenantAccessDenied();

        Map<String, ChartOfAccount> accounts = chartRepository.findAllByOrderByCodeAsc()
                .stream()
                .collect(java.util.stream.Collectors.toMap(ChartOfAccount::getCode, account -> account));

        List<JournalEntryResponse> entries = java.util.stream.Stream.concat(
                        java.util.stream.Stream.concat(
                                transactionJournalEntries(tenantId, currentSession, accounts).stream(),
                                loanDisbursementJournalEntries(tenantId, currentSession, accounts).stream()),
                        java.util.stream.Stream.concat(
                                loanRepaymentJournalEntries(tenantId, currentSession, accounts).stream(),
                                java.util.stream.Stream.concat(
                                        subscriptionPaymentJournalEntries(tenantId, currentSession, accounts).stream(),
                                        java.util.stream.Stream.concat(
                                                expenseJournalEntries(tenantId, currentSession, accounts).stream(),
                                                java.util.stream.Stream.concat(
                                                        welfareClaimJournalEntries(tenantId, currentSession, accounts).stream(),
                                                        assetJournalEntries(tenantId, currentSession, accounts).stream())))))
                .sorted(Comparator.comparing(JournalEntryResponse::postedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .toList();

        return ResponseEntity.ok(ApiResponse.of(entries));
    }

    @GetMapping("/suppliers")
    ResponseEntity<?> listSuppliers(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "accounting:view")) {
            return authService.permissionRequired("accounting:view");
        }

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null && !authService.isPlatform(currentSession.user())) return tenantAccessDenied();

        List<Supplier> suppliers = authService.isPlatform(currentSession.user()) && requestedTenantId == null
                ? supplierRepository.findAllByOrderByTenantIdAscNameAsc()
                : supplierRepository.findByTenantIdOrderByNameAsc(tenantId);

        return ResponseEntity.ok(ApiResponse.of(suppliers.stream().map(SupplierResponse::from).toList()));
    }

    @PostMapping("/suppliers")
    ResponseEntity<?> createSupplier(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody CreateSupplierRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "accounting:post")) {
            return authService.permissionRequired("accounting:post");
        }

        String tenantId = tenantScope(currentSession, body.tenantId());
        if (tenantId == null) return tenantAccessDenied();

        String name = body.name().trim();
        if (supplierRepository.existsByTenantIdAndNameIgnoreCase(tenantId, name)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "SUPPLIER_EXISTS", "A supplier with that name already exists for this tenant."));
        }

        Supplier supplier = supplierRepository.save(new Supplier(
                "supplier_" + UUID.randomUUID(),
                tenantId,
                name,
                blankToNull(body.phone()),
                blankToNull(body.email()),
                blankToNull(body.taxId()),
                currentSession.user().getId()));
        auditService.record(
                tenantId,
                currentSession.user(),
                "Created supplier " + supplier.getName(),
                "supplier",
                supplier.getId(),
                request.getRemoteAddr());

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(SupplierResponse.from(supplier)));
    }

    @GetMapping("/expenses")
    ResponseEntity<?> listExpenses(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "accounting:view")) {
            return authService.permissionRequired("accounting:view");
        }

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null && !authService.isPlatform(currentSession.user())) return tenantAccessDenied();

        List<Expense> expenses = authService.isPlatform(currentSession.user()) && requestedTenantId == null
                ? expenseRepository.findAllByOrderByTenantIdAscExpenseDateDescCreatedAtDesc()
                : expenseRepository.findByTenantIdOrderByExpenseDateDescCreatedAtDesc(tenantId);

        return ResponseEntity.ok(ApiResponse.of(expenses.stream().map(ExpenseResponse::from).toList()));
    }

    @PostMapping("/expenses")
    ResponseEntity<?> createExpense(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody CreateExpenseRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "accounting:post")) {
            return authService.permissionRequired("accounting:post");
        }

        String tenantId = tenantScope(currentSession, body.tenantId());
        if (tenantId == null) return tenantAccessDenied();

        String accountCode = body.accountCode().trim();
        ChartOfAccount account = chartRepository.findById(accountCode).orElse(null);
        if (account == null || !"expense".equals(account.getType())) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_EXPENSE_ACCOUNT", "Expense account code must exist and be an expense account."));
        }

        String channel = body.channel().trim();
        if (!EXPENSE_CHANNELS.contains(channel)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_EXPENSE_CHANNEL", "Unsupported expense payment channel."));
        }
        if (body.amount().compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_EXPENSE_AMOUNT", "Expense amount must be greater than zero."));
        }

        String supplierId = blankToNull(body.supplierId());
        if (supplierId != null && supplierRepository.findById(supplierId)
                .filter(supplier -> supplier.getTenantId().equals(tenantId))
                .isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_SUPPLIER", "Supplier does not exist for this tenant."));
        }

        LocalDate expenseDate = body.expenseDate() == null ? LocalDate.now() : body.expenseDate();
        if (periodService.isClosed(tenantId, expenseDate)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "ACCOUNTING_PERIOD_CLOSED", "Accounting period " + periodService.periodKey(expenseDate) + " is closed."));
        }

        String reference = body.reference() == null || body.reference().isBlank()
                ? referenceForExpense(tenantId)
                : body.reference().trim();
        if (expenseRepository.existsByTenantIdAndReferenceIgnoreCase(tenantId, reference)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "EXPENSE_REFERENCE_EXISTS", "An expense with that reference already exists for this tenant."));
        }

        Expense expense = expenseRepository.save(new Expense(
                "expense_" + UUID.randomUUID(),
                tenantId,
                supplierId,
                accountCode,
                body.amount(),
                channel,
                reference,
                body.description() == null ? "" : body.description().trim(),
                expenseDate,
                currentSession.user().getId()));
        auditService.record(
                tenantId,
                currentSession.user(),
                "Posted expense " + expense.getReference(),
                "expense",
                expense.getId(),
                request.getRemoteAddr());

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(ExpenseResponse.from(expense)));
    }

    @GetMapping("/assets")
    ResponseEntity<?> listAssets(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "accounting:view")) {
            return authService.permissionRequired("accounting:view");
        }

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null && !authService.isPlatform(currentSession.user())) return tenantAccessDenied();

        List<Asset> assets = authService.isPlatform(currentSession.user()) && requestedTenantId == null
                ? assetRepository.findAllByOrderByTenantIdAscPurchaseDateDescCreatedAtDesc()
                : assetRepository.findByTenantIdOrderByPurchaseDateDescCreatedAtDesc(tenantId);

        return ResponseEntity.ok(ApiResponse.of(assets.stream().map(this::assetResponse).toList()));
    }

    @PostMapping("/assets")
    ResponseEntity<?> createAsset(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody CreateAssetRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "accounting:post")) {
            return authService.permissionRequired("accounting:post");
        }

        String tenantId = tenantScope(currentSession, body.tenantId());
        if (tenantId == null) return tenantAccessDenied();

        String category = body.category().trim();
        if (!ASSET_CATEGORIES.contains(category)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_ASSET_CATEGORY", "Unsupported fixed asset category."));
        }

        String assetAccountCode = body.assetAccountCode().trim();
        ChartOfAccount account = chartRepository.findById(assetAccountCode).orElse(null);
        if (account == null || !"asset".equals(account.getType()) || "1310".equals(assetAccountCode)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_ASSET_ACCOUNT", "Asset account code must be a fixed asset account."));
        }

        String channel = body.channel().trim();
        if (!EXPENSE_CHANNELS.contains(channel)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_ASSET_CHANNEL", "Unsupported asset payment channel."));
        }
        if (body.cost().compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_ASSET_COST", "Asset cost must be greater than zero."));
        }

        BigDecimal salvageValue = body.salvageValue() == null ? BigDecimal.ZERO : body.salvageValue();
        if (salvageValue.compareTo(BigDecimal.ZERO) < 0 || salvageValue.compareTo(body.cost()) >= 0) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_ASSET_SALVAGE_VALUE", "Salvage value must be at least zero and less than cost."));
        }
        if (body.usefulLifeMonths() == null || body.usefulLifeMonths() <= 0) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_ASSET_LIFE", "Useful life must be greater than zero months."));
        }

        LocalDate purchaseDate = body.purchaseDate() == null ? LocalDate.now() : body.purchaseDate();
        if (periodService.isClosed(tenantId, purchaseDate)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "ACCOUNTING_PERIOD_CLOSED", "Accounting period " + periodService.periodKey(purchaseDate) + " is closed."));
        }

        String reference = body.reference() == null || body.reference().isBlank()
                ? referenceForAsset(tenantId)
                : body.reference().trim();
        if (assetRepository.existsByTenantIdAndReferenceIgnoreCase(tenantId, reference)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "ASSET_REFERENCE_EXISTS", "An asset with that reference already exists for this tenant."));
        }

        Asset asset = assetRepository.save(new Asset(
                "asset_" + UUID.randomUUID(),
                tenantId,
                body.name().trim(),
                category,
                assetAccountCode,
                body.cost(),
                salvageValue,
                body.usefulLifeMonths(),
                purchaseDate,
                body.depreciationStartDate() == null ? purchaseDate.withDayOfMonth(1) : body.depreciationStartDate(),
                channel,
                reference,
                blankToNull(body.location()),
                blankToNull(body.custodianUserId()),
                currentSession.user().getId()));
        auditService.record(
                tenantId,
                currentSession.user(),
                "Registered asset " + asset.getReference(),
                "asset",
                asset.getId(),
                request.getRemoteAddr());

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(assetResponse(asset)));
    }

    @GetMapping("/statement-lines")
    ResponseEntity<?> listStatementLines(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "accounting:view")) {
            return authService.permissionRequired("accounting:view");
        }

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null) return tenantAccessDenied();

        List<StatementLine> lines = authService.isPlatform(currentSession.user()) && requestedTenantId == null
                ? statementLineRepository.findAllByOrderByTenantIdAscStatementDateDescCreatedAtDesc()
                : statementLineRepository.findByTenantIdOrderByStatementDateDescCreatedAtDesc(tenantId);

        return ResponseEntity.ok(ApiResponse.of(lines.stream().map(StatementLineResponse::from).toList()));
    }

    @PostMapping("/statement-lines")
    ResponseEntity<?> createStatementLine(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody CreateStatementLineRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "accounting:post")) {
            return authService.permissionRequired("accounting:post");
        }

        String tenantId = tenantScope(currentSession, body.tenantId());
        if (tenantId == null) return tenantAccessDenied();

        String channel = body.channel().trim();
        if (!STATEMENT_CHANNELS.contains(channel)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_STATEMENT_CHANNEL", "Unsupported statement channel."));
        }
        if (body.amount().compareTo(BigDecimal.ZERO) == 0) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_STATEMENT_AMOUNT", "Statement amount cannot be zero."));
        }

        String externalReference = body.externalReference().trim();
        if (statementLineRepository.existsByTenantIdAndExternalReferenceIgnoreCase(tenantId, externalReference)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "STATEMENT_LINE_EXISTS", "A statement line with that reference already exists for this tenant."));
        }

        LocalDate statementDate = body.statementDate() == null ? LocalDate.now() : body.statementDate();
        if (periodService.isClosed(tenantId, statementDate)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "ACCOUNTING_PERIOD_CLOSED", "Accounting period " + periodService.periodKey(statementDate) + " is closed."));
        }

        StatementLine line = statementLineRepository.save(new StatementLine(
                "statement_" + UUID.randomUUID(),
                tenantId,
                accountForChannel(channel),
                channel,
                body.amount(),
                externalReference,
                body.description() == null ? "" : body.description().trim(),
                statementDate,
                currentSession.user().getId()));
        auditService.record(
                tenantId,
                currentSession.user(),
                "Imported statement line " + line.getExternalReference(),
                "statement_line",
                line.getId(),
                request.getRemoteAddr());

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(StatementLineResponse.from(line)));
    }

    @GetMapping("/reconciliation")
    ResponseEntity<?> getReconciliation(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "accounting:view")) {
            return authService.permissionRequired("accounting:view");
        }

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null) return tenantAccessDenied();

        List<String> tenantIds = authService.isPlatform(currentSession.user()) && requestedTenantId == null
                ? statementLineRepository.findAll().stream().map(StatementLine::getTenantId).distinct().toList()
                : List.of(tenantId);
        return ResponseEntity.ok(ApiResponse.of(reconciliationForTenants(tenantIds, currentSession)));
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
                    boolean reversal = transaction.getOriginalTransactionId() != null;
                    List<JournalLineResponse> lines;
                    if ("withdrawal".equals(transaction.getType())) {
                        lines = reversal
                                ? List.of(
                                        line(cashAccount, transaction.getAmount(), BigDecimal.ZERO, transaction.getMemberId(), accounts),
                                        line("2000", BigDecimal.ZERO, transaction.getAmount(), transaction.getMemberId(), accounts))
                                : List.of(
                                        line("2000", transaction.getAmount(), BigDecimal.ZERO, transaction.getMemberId(), accounts),
                                        line(cashAccount, BigDecimal.ZERO, transaction.getAmount(), transaction.getMemberId(), accounts));
                    } else {
                        lines = reversal
                                ? List.of(
                                        line(accountForTransactionType(transaction.getType()), transaction.getAmount(), BigDecimal.ZERO, transaction.getMemberId(), accounts),
                                        line(cashAccount, BigDecimal.ZERO, transaction.getAmount(), transaction.getMemberId(), accounts))
                                : List.of(
                                        line(cashAccount, transaction.getAmount(), BigDecimal.ZERO, transaction.getMemberId(), accounts),
                                        line(accountForTransactionType(transaction.getType()), BigDecimal.ZERO, transaction.getAmount(), transaction.getMemberId(), accounts));
                    }
                    return journal(
                            "je_" + transaction.getId(),
                            transaction.getTenantId(),
                            reversal ? "financial_transaction_reversal" : "financial_transaction",
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

    private List<JournalEntryResponse> expenseJournalEntries(
            String tenantId,
            AuthService.CurrentSession currentSession,
            Map<String, ChartOfAccount> accounts) {
        List<Expense> expenses = authService.isPlatform(currentSession.user()) && tenantId == null
                ? expenseRepository.findAllByOrderByTenantIdAscExpenseDateDescCreatedAtDesc()
                : expenseRepository.findByTenantIdOrderByExpenseDateDescCreatedAtDesc(tenantId);

        return expenses.stream()
                .filter(expense -> "posted".equals(expense.getStatus()))
                .map(expense -> journal(
                        "je_" + expense.getId(),
                        expense.getTenantId(),
                        "expense",
                        expense.getId(),
                        expense.getReference(),
                        expense.getDescription() == null || expense.getDescription().isBlank()
                                ? "Posted operating expense"
                                : expense.getDescription(),
                        expense.getCreatedAt(),
                        List.of(
                                line(expense.getAccountCode(), expense.getAmount(), BigDecimal.ZERO, null, accounts),
                                line(accountForChannel(expense.getChannel()), BigDecimal.ZERO, expense.getAmount(), null, accounts))))
                .toList();
    }

    private List<JournalEntryResponse> subscriptionPaymentJournalEntries(
            String tenantId,
            AuthService.CurrentSession currentSession,
            Map<String, ChartOfAccount> accounts) {
        List<SubscriptionPayment> payments = authService.isPlatform(currentSession.user()) && tenantId == null
                ? subscriptionPaymentRepository.findAllByOrderByTenantIdAscReceivedAtDesc()
                : subscriptionPaymentRepository.findByTenantIdOrderByReceivedAtDesc(tenantId);

        return payments.stream()
                .map(payment -> journal(
                        "je_" + payment.getId(),
                        payment.getTenantId(),
                        "subscription_payment",
                        payment.getId(),
                        payment.getExternalReference(),
                        "Recorded platform subscription payment",
                        payment.getReceivedAt(),
                        List.of(
                                line("6100", payment.getAmount(), BigDecimal.ZERO, null, accounts),
                                line(accountForChannel(payment.getChannel()), BigDecimal.ZERO, payment.getAmount(), null, accounts))))
                .toList();
    }

    private List<JournalEntryResponse> welfareClaimJournalEntries(
            String tenantId,
            AuthService.CurrentSession currentSession,
            Map<String, ChartOfAccount> accounts) {
        List<WelfareClaim> claims = authService.isPlatform(currentSession.user()) && tenantId == null
                ? welfareClaimRepository.findAllByOrderByTenantIdAscSubmittedAtDesc()
                : welfareClaimRepository.findByTenantIdOrderBySubmittedAtDesc(tenantId);

        return claims.stream()
                .filter(claim -> "paid".equals(claim.getStatus()))
                .map(claim -> journal(
                        "je_" + claim.getId(),
                        claim.getTenantId(),
                        "welfare_claim",
                        claim.getId(),
                        claim.getReference(),
                        claim.getDescription() == null || claim.getDescription().isBlank()
                                ? "Paid welfare claim"
                                : claim.getDescription(),
                        claim.getPaidAt(),
                        List.of(
                                line("2200", claim.getAmount(), BigDecimal.ZERO, claim.getMemberId(), accounts),
                                line(accountForChannel(claim.getChannel()), BigDecimal.ZERO, claim.getAmount(), claim.getMemberId(), accounts))))
                .toList();
    }

    private List<JournalEntryResponse> assetJournalEntries(
            String tenantId,
            AuthService.CurrentSession currentSession,
            Map<String, ChartOfAccount> accounts) {
        List<Asset> assets = authService.isPlatform(currentSession.user()) && tenantId == null
                ? assetRepository.findAllByOrderByTenantIdAscPurchaseDateDescCreatedAtDesc()
                : assetRepository.findByTenantIdOrderByPurchaseDateDescCreatedAtDesc(tenantId);

        return assets.stream()
                .filter(asset -> "active".equals(asset.getStatus()))
                .flatMap(asset -> {
                    JournalEntryResponse acquisition = journal(
                            "je_acquisition_" + asset.getId(),
                            asset.getTenantId(),
                            "asset_acquisition",
                            asset.getId(),
                            asset.getReference(),
                            "Registered fixed asset " + asset.getName(),
                            asset.getCreatedAt(),
                            List.of(
                                    line(asset.getAssetAccountCode(), asset.getCost(), BigDecimal.ZERO, null, accounts),
                                    line(accountForChannel(asset.getChannel()), BigDecimal.ZERO, asset.getCost(), null, accounts)));
                    BigDecimal depreciation = accumulatedDepreciation(asset);
                    if (depreciation.compareTo(BigDecimal.ZERO) <= 0) {
                        return java.util.stream.Stream.of(acquisition);
                    }
                    JournalEntryResponse depreciationEntry = journal(
                            "je_depreciation_" + asset.getId(),
                            asset.getTenantId(),
                            "asset_depreciation",
                            asset.getId(),
                            asset.getReference() + "-DEP",
                            "Accumulated depreciation for " + asset.getName(),
                            Instant.now(),
                            List.of(
                                    line("5050", depreciation, BigDecimal.ZERO, null, accounts),
                                    line("1310", BigDecimal.ZERO, depreciation, null, accounts)));
                    return java.util.stream.Stream.of(acquisition, depreciationEntry);
                })
                .toList();
    }

    private ReconciliationResponse reconciliationForTenants(List<String> tenantIds, AuthService.CurrentSession currentSession) {
        Map<String, ChartOfAccount> accounts = chartRepository.findAllByOrderByCodeAsc()
                .stream()
                .collect(java.util.stream.Collectors.toMap(ChartOfAccount::getCode, account -> account));
        List<JournalEntryResponse> entries = tenantIds.stream()
                .flatMap(tenantId -> java.util.stream.Stream.concat(
                        java.util.stream.Stream.concat(
                                transactionJournalEntries(tenantId, currentSession, accounts).stream(),
                                loanDisbursementJournalEntries(tenantId, currentSession, accounts).stream()),
                        java.util.stream.Stream.concat(
                                loanRepaymentJournalEntries(tenantId, currentSession, accounts).stream(),
                                java.util.stream.Stream.concat(
                                        subscriptionPaymentJournalEntries(tenantId, currentSession, accounts).stream(),
                                        java.util.stream.Stream.concat(
                                                expenseJournalEntries(tenantId, currentSession, accounts).stream(),
                                                assetJournalEntries(tenantId, currentSession, accounts).stream())))))
                .toList();
        List<StatementLine> statementLines = tenantIds.size() == 1
                ? statementLineRepository.findByTenantIdOrderByStatementDateDescCreatedAtDesc(tenantIds.get(0))
                : statementLineRepository.findAllByOrderByTenantIdAscStatementDateDescCreatedAtDesc()
                        .stream()
                        .filter(line -> tenantIds.contains(line.getTenantId()))
                        .toList();
        List<LedgerLineResponse> ledgerLines = cashLedgerLines(entries);
        List<ReconciliationResponse.ReconciliationMatch> matches = new java.util.ArrayList<>();
        Set<String> matchedStatementIds = new HashSet<>();
        Set<String> matchedLedgerIds = new HashSet<>();

        for (StatementLine statementLine : statementLines) {
            LedgerLineResponse match = ledgerLines.stream()
                    .filter(ledgerLine -> !matchedLedgerIds.contains(ledgerLine.id()))
                    .filter(ledgerLine -> ledgerLine.tenantId().equals(statementLine.getTenantId()))
                    .filter(ledgerLine -> ledgerLine.accountCode().equals(statementLine.getAccountCode()))
                    .filter(ledgerLine -> ledgerLine.reference().equals(statementLine.getExternalReference()))
                    .filter(ledgerLine -> ledgerLine.amount().compareTo(statementLine.getAmount()) == 0)
                    .findFirst()
                    .orElse(null);
            if (match == null) continue;
            matchedStatementIds.add(statementLine.getId());
            matchedLedgerIds.add(match.id());
            matches.add(new ReconciliationResponse.ReconciliationMatch(StatementLineResponse.from(statementLine), match));
        }

        List<StatementLineResponse> unmatchedStatementLines = statementLines.stream()
                .filter(line -> !matchedStatementIds.contains(line.getId()))
                .map(StatementLineResponse::from)
                .toList();
        List<LedgerLineResponse> unmatchedLedgerLines = ledgerLines.stream()
                .filter(line -> !matchedLedgerIds.contains(line.id()))
                .toList();

        BigDecimal matchedAmount = matches.stream()
                .map(match -> match.statementLine().amount().abs())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal unmatchedStatementAmount = unmatchedStatementLines.stream()
                .map(line -> line.amount().abs())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal unmatchedLedgerAmount = unmatchedLedgerLines.stream()
                .map(line -> line.amount().abs())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new ReconciliationResponse(
                new ReconciliationResponse.ReconciliationSummary(
                        statementLines.size(),
                        ledgerLines.size(),
                        matches.size(),
                        unmatchedStatementLines.size(),
                        unmatchedLedgerLines.size(),
                        matchedAmount,
                        unmatchedStatementAmount,
                        unmatchedLedgerAmount),
                matches,
                unmatchedStatementLines,
                unmatchedLedgerLines);
    }

    private List<LedgerLineResponse> cashLedgerLines(List<JournalEntryResponse> entries) {
        List<LedgerLineResponse> lines = new java.util.ArrayList<>();
        for (JournalEntryResponse entry : entries) {
            for (int i = 0; i < entry.lines().size(); i++) {
                JournalLineResponse line = entry.lines().get(i);
                if (!CASH_ACCOUNTS.contains(line.accountCode())) continue;
                lines.add(new LedgerLineResponse(
                        entry.id() + "_" + i,
                        entry.tenantId(),
                        entry.id(),
                        entry.sourceType(),
                        entry.sourceId(),
                        entry.reference(),
                        entry.description(),
                        entry.postedAt(),
                        line.accountCode(),
                        line.accountName(),
                        line.debit().subtract(line.credit())));
            }
        }
        return lines;
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

    private AssetResponse assetResponse(Asset asset) {
        BigDecimal depreciation = accumulatedDepreciation(asset);
        return AssetResponse.from(asset, depreciation, netBookValue(asset));
    }

    private BigDecimal netBookValue(Asset asset) {
        BigDecimal value = asset.getCost().subtract(accumulatedDepreciation(asset));
        return value.max(asset.getSalvageValue());
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

    private String accountForChannel(String channel) {
        return switch (channel) {
            case "cash" -> "1000";
            case "mobile_money" -> "1020";
            case "payroll_deduction", "payroll" -> "1030";
            case "bank", "manual" -> "1010";
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

    private String referenceForExpense(String tenantId) {
        return "EXP-" + tenantId.replace("tenant_", "").toUpperCase() + "-" + String.format("%04d", expenseRepository.countByTenantId(tenantId) + 1);
    }

    private String referenceForAsset(String tenantId) {
        return "AST-" + tenantId.replace("tenant_", "").toUpperCase() + "-" + String.format("%04d", assetRepository.countByTenantId(tenantId) + 1);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
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

    private boolean canAccess(AuthService.CurrentSession currentSession, String tenantId) {
        return authService.isPlatform(currentSession.user()) || tenantId.equals(currentSession.user().getTenantId());
    }

    private ResponseEntity<ApiErrorResponse> tenantAccessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access accounting data for another tenant."));
    }

    record UpdateAccountingPeriodStatusRequest(@NotBlank String status) {
    }

    record CreateStatementLineRequest(
            String tenantId,
            @NotBlank String channel,
            @NotNull BigDecimal amount,
            @NotBlank String externalReference,
            String description,
            LocalDate statementDate) {
    }

    record CreateSupplierRequest(
            String tenantId,
            @NotBlank String name,
            String phone,
            String email,
            String taxId) {
    }

    record CreateExpenseRequest(
            String tenantId,
            String supplierId,
            @NotBlank String accountCode,
            @NotNull BigDecimal amount,
            @NotBlank String channel,
            String reference,
            String description,
            LocalDate expenseDate) {
    }

    record CreateAssetRequest(
            String tenantId,
            @NotBlank String name,
            @NotBlank String category,
            @NotBlank String assetAccountCode,
            @NotNull BigDecimal cost,
            BigDecimal salvageValue,
            Integer usefulLifeMonths,
            LocalDate purchaseDate,
            LocalDate depreciationStartDate,
            @NotBlank String channel,
            String reference,
            String location,
            String custodianUserId) {
    }
}
