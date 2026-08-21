package com.methaltech.sacco.finance;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.api.PageParams;
import com.methaltech.sacco.api.PagedResponse;
import com.methaltech.sacco.accounting.AccountingPeriodService;
import com.methaltech.sacco.branch.Branch;
import com.methaltech.sacco.branch.BranchRepository;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberRepository;
import com.methaltech.sacco.money.Money;
import com.methaltech.sacco.notification.NotificationService;
import com.methaltech.sacco.tenant.TenantMoneyFormatter;
import com.methaltech.sacco.tenant.CollectionMode;
import com.methaltech.sacco.tenant.TenantResponse;
import com.methaltech.sacco.tenant.TenantService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/financial-transactions")
class FinancialTransactionController {

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "savings_deposit",
            "share_purchase",
            "welfare_contribution",
            "loan_repayment",
            "withdrawal");
    private static final Set<String> ALLOWED_CHANNELS = Set.of(
            "mobile_money",
            "cash",
            "bank",
            "payroll_deduction");
    private static final Set<String> DECISION_STATUSES = Set.of("posted", "rejected");
    private static final List<String> OPENING_BALANCE_IMPORT_HEADERS = List.of(
            "membershipNo",
            "savingsBalance",
            "sharesBalance",
            "welfareBalance",
            "reference",
            "postingDate",
            "narration");

    private final FinancialTransactionRepository transactionRepository;
    private final MemberRepository memberRepository;
    private final BranchRepository branchRepository;
    private final TenantService tenantService;
    private final TenantMoneyFormatter moneyFormatter;
    private final AuthService authService;
    private final AuditService auditService;
    private final AccountingPeriodService periodService;
    private final com.methaltech.sacco.member.MemberFundBalanceService memberFundBalanceService;
    private final FundTypeRepository fundTypeRepository;
    private final NotificationService notificationService;

    FinancialTransactionController(
            FinancialTransactionRepository transactionRepository,
            MemberRepository memberRepository,
            BranchRepository branchRepository,
            TenantService tenantService,
            TenantMoneyFormatter moneyFormatter,
            AuthService authService,
            AuditService auditService,
            AccountingPeriodService periodService,
            com.methaltech.sacco.member.MemberFundBalanceService memberFundBalanceService,
            FundTypeRepository fundTypeRepository,
            NotificationService notificationService) {
        this.transactionRepository = transactionRepository;
        this.memberRepository = memberRepository;
        this.branchRepository = branchRepository;
        this.tenantService = tenantService;
        this.moneyFormatter = moneyFormatter;
        this.authService = authService;
        this.auditService = auditService;
        this.periodService = periodService;
        this.memberFundBalanceService = memberFundBalanceService;
        this.fundTypeRepository = fundTypeRepository;
        this.notificationService = notificationService;
    }

    /** A custom contribution type ({@code <fundCode>_contribution}) whose fund is configured and active. */
    private boolean isConfiguredFundContribution(String tenantId, String type) {
        String fundCode = com.methaltech.sacco.member.MemberFundBalanceService.fundCodeForType(type);
        return fundCode != null
                && fundTypeRepository.existsByTenantIdAndCodeIgnoreCaseAndActiveTrue(tenantId, fundCode);
    }

    @GetMapping
    ResponseEntity<?> listTransactions(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId,
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "sort", required = false) String sortBy,
            @RequestParam(name = "direction", required = false) String direction,
            @RequestParam(name = "page", required = false) Integer page,
            @RequestParam(name = "size", required = false) Integer size) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "transactions:view")) {
            return authService.permissionRequired("transactions:view");
        }

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null) return tenantAccessDenied();

        boolean platformAll = authService.isPlatform(currentSession.user()) && requestedTenantId == null;
        String searchTerm = searchTerm(search);
        List<String> branchScope = branchScope(currentSession, tenantId);

        // Opt-in pagination: only when the caller supplies page/size, so existing clients that expect
        // the full list are unaffected.
        if (PageParams.requested(page, size)) {
            Sort sort = sortBy(platformAll, sortBy, direction, Map.of(
                    "reference", "reference",
                    "postedAt", "postedAt",
                    "createdAt", "createdAt",
                    "type", "type",
                    "channel", "channel",
                    "amount", "amount",
                    "status", "status",
                    "memberId", "memberId",
                    "tenantId", "tenantId"), "createdAt", Sort.Direction.DESC);
            Pageable pageable = PageParams.toPageable(page, size, sort);
            Page<FinancialTransaction> result = platformAll
                    ? (searchTerm == null ? transactionRepository.findAll(pageable) : transactionRepository.searchAll(searchTerm, pageable))
                    : (!branchScope.isEmpty()
                            ? (searchTerm == null
                                    ? transactionRepository.findByTenantIdAndBranchIdIn(tenantId, branchScope, pageable)
                                    : transactionRepository.searchByTenantIdAndBranchIds(tenantId, branchScope, searchTerm, pageable))
                            : (searchTerm == null
                                    ? transactionRepository.findByTenantId(tenantId, pageable)
                                    : transactionRepository.searchByTenantId(tenantId, searchTerm, pageable)));
            List<FinancialTransactionResponse> items = result.getContent().stream()
                    .map(FinancialTransactionResponse::from)
                    .toList();
            return ResponseEntity.ok(PagedResponse.of(
                    items, result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages()));
        }

        List<FinancialTransaction> transactions = platformAll
                ? transactionRepository.findAllByOrderByTenantIdAscCreatedAtDesc()
                : (!branchScope.isEmpty()
                        ? transactionRepository.findByTenantIdAndBranchIdInOrderByCreatedAtDesc(tenantId, branchScope)
                        : transactionRepository.findByTenantIdOrderByCreatedAtDesc(tenantId));
        if (searchTerm != null) {
            String needle = searchTerm.toLowerCase(Locale.ROOT);
            transactions = transactions.stream()
                    .filter(transaction -> searchable(transaction.getReference(), transaction.getType(), transaction.getChannel(), transaction.getStatus(), transaction.getNarration(), transaction.getMemberId()).contains(needle))
                    .toList();
        }

        return ResponseEntity.ok(ApiResponse.of(transactions.stream().map(FinancialTransactionResponse::from).toList()));
    }

    @PostMapping
    ResponseEntity<?> createTransaction(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody CreateTransactionRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "transactions:create")) {
            return authService.permissionRequired("transactions:create");
        }

        String tenantId = tenantScope(currentSession, body.tenantId());
        if (tenantId == null) return tenantAccessDenied();

        Member member = memberRepository.findById(body.memberId().trim())
                .filter(candidate -> candidate.getTenantId().equals(tenantId))
                .orElse(null);
        if (member == null) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_MEMBER", "Member does not exist for this tenant."));
        }

        String branchId = body.branchId() == null || body.branchId().isBlank() ? member.getBranchId() : body.branchId().trim();
        if (!branchId.equals(member.getBranchId())) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "BRANCH_MEMBER_MISMATCH", "Transaction branch must match the member branch."));
        }
        if (!canAccessBranch(currentSession, tenantId, branchId)) {
            return branchAccessDenied();
        }
        if (branchRepository.findById(branchId)
                .filter(branch -> branch.getTenantId().equals(tenantId))
                .isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_BRANCH", "Branch does not exist for this tenant."));
        }

        String type = body.type().trim();
        if (!ALLOWED_TYPES.contains(type) && !isConfiguredFundContribution(tenantId, type)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_TRANSACTION_TYPE", "Unsupported transaction type."));
        }

        String channel = body.channel().trim();
        if (!ALLOWED_CHANNELS.contains(channel)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_PAYMENT_CHANNEL", "Unsupported payment channel."));
        }

        BigDecimal amount = Money.normalize(body.amount());
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_TRANSACTION_AMOUNT", "Amount must be greater than zero."));
        }

        String reference = referenceForTenant(tenantId);
        FinancialTransaction transaction = transactionRepository.save(new FinancialTransaction(
                "txn_" + UUID.randomUUID(),
                tenantId,
                branchId,
                member.getId(),
                type,
                channel,
                amount,
                reference,
                body.narration() == null ? "" : body.narration().trim(),
                currentSession.user().getId()));

        auditService.record(
                tenantId,
                currentSession.user(),
                "Submitted financial transaction " + reference,
                "financial_transaction",
                transaction.getId(),
                request.getRemoteAddr());

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(FinancialTransactionResponse.from(transaction)));
    }

    @GetMapping("/opening-balances/import-template")
    ResponseEntity<?> openingBalanceImportTemplate(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "transactions:create")) {
            return authService.permissionRequired("transactions:create");
        }

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null) return tenantAccessDenied();

        Member sampleMember = memberRepository.findByTenantIdOrderByMembershipNoAsc(tenantId).stream().findFirst().orElse(null);
        OpeningBalanceImportRow sample = new OpeningBalanceImportRow(
                sampleMember == null ? "" : sampleMember.getMembershipNo(),
                "100000",
                "50000",
                "10000",
                sampleMember == null ? "OB-SAMPLE-001" : "OB-" + sampleMember.getMembershipNo(),
                LocalDate.now().toString(),
                "Opening balances from approved pilot data import");
        List<OpeningBalanceImportRow> sampleRows = List.of(sample);

        return ResponseEntity.ok(ApiResponse.of(new OpeningBalanceImportTemplateResponse(
                tenantId,
                "opening-balances-import-template-" + tenantId + ".csv",
                "text/csv",
                OPENING_BALANCE_IMPORT_HEADERS,
                sampleRows,
                openingBalanceCsvTemplate(sampleRows))));
    }

    @PostMapping("/opening-balances/import")
    @Transactional
    ResponseEntity<?> importOpeningBalances(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody OpeningBalanceImportRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "transactions:approve")) {
            return authService.permissionRequired("transactions:approve");
        }

        String tenantId = tenantScope(currentSession, body.tenantId());
        if (tenantId == null) return tenantAccessDenied();

        List<OpeningBalanceImportRow> rows = body.rows() == null ? List.of() : body.rows();
        boolean dryRun = body.dryRun() == null || body.dryRun();
        List<OpeningBalanceImportError> errors = validateOpeningBalanceRows(tenantId, rows);
        if (!errors.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.of(new OpeningBalanceImportResult(
                    tenantId,
                    dryRun,
                    false,
                    rows.size(),
                    0,
                    rows.size(),
                    errors,
                    List.of())));
        }

        if (dryRun) {
            return ResponseEntity.ok(ApiResponse.of(new OpeningBalanceImportResult(
                    tenantId,
                    true,
                    true,
                    rows.size(),
                    0,
                    0,
                    List.of(),
                    List.of())));
        }

        List<FinancialTransaction> created = new ArrayList<>();
        for (OpeningBalanceImportRow row : rows) {
            Member member = memberRepository.findFirstByTenantIdAndMembershipNoIgnoreCase(tenantId, row.membershipNo().trim())
                    .orElseThrow();
            created.addAll(postOpeningBalanceTransactions(tenantId, row, member, currentSession.user().getId()));
            memberRepository.save(member);
        }

        auditService.record(
                tenantId,
                currentSession.user(),
                "Imported opening balances for " + rows.size() + " members",
                "opening_balance_import",
                tenantId,
                request.getRemoteAddr());

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(new OpeningBalanceImportResult(
                tenantId,
                false,
                true,
                rows.size(),
                created.size(),
                0,
                List.of(),
                created.stream().map(FinancialTransactionResponse::from).toList())));
    }

    @GetMapping("/{transactionId}/receipt")
    ResponseEntity<?> getReceipt(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String transactionId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "transactions:view")) {
            return authService.permissionRequired("transactions:view");
        }

        return transactionRepository.findById(transactionId)
                .<ResponseEntity<?>>map(transaction -> receiptResponse(transaction, currentSession))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "TRANSACTION_NOT_FOUND", "Financial transaction not found.")));
    }

    @PostMapping("/{transactionId}/reversal")
    @Transactional
    ResponseEntity<?> reverseTransaction(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String transactionId,
            @Valid @RequestBody ReverseTransactionRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "transactions:approve")) {
            return authService.permissionRequired("transactions:approve");
        }

        return transactionRepository.findById(transactionId)
                .<ResponseEntity<?>>map(transaction -> reversePostedTransaction(transaction, body.reason(), currentSession, request))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "TRANSACTION_NOT_FOUND", "Financial transaction not found.")));
    }

    @PatchMapping("/{transactionId}/status")
    @Transactional
    ResponseEntity<?> updateTransactionStatus(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String transactionId,
            @Valid @RequestBody UpdateTransactionStatusRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "transactions:approve")) {
            return authService.permissionRequired("transactions:approve");
        }

        String status = body.status().trim();
        if (!DECISION_STATUSES.contains(status)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(
                            400,
                            "INVALID_TRANSACTION_STATUS",
                            "Financial transactions can only be posted or rejected from the approval queue."));
        }

        return transactionRepository.findById(transactionId)
                .<ResponseEntity<?>>map(transaction -> decideTransaction(transaction, status, body.reason(), currentSession, request))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "TRANSACTION_NOT_FOUND", "Financial transaction not found.")));
    }

    private ResponseEntity<?> decideTransaction(
            FinancialTransaction transaction,
            String status,
            String reason,
            AuthService.CurrentSession currentSession,
            HttpServletRequest request) {
        if (!canAccessTransaction(currentSession, transaction)) return transactionAccessDenied(currentSession, transaction);
        if (!"pending_approval".equals(transaction.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(
                            409,
                            "TRANSACTION_ALREADY_DECIDED",
                            "Only pending financial transactions can be decided."));
        }
        if (transaction.getMakerUserId().equals(currentSession.user().getId())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(
                            409,
                            "MAKER_CHECKER_REQUIRED",
                            "The maker cannot approve or reject their own financial transaction."));
        }
        if (memberRepository.findFirstByLinkedUserId(currentSession.user().getId())
                .map(linked -> linked.getId().equals(transaction.getMemberId()))
                .orElse(false)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(
                            409,
                            "CONFLICT_OF_INTEREST",
                            "Your staff account is linked to this member, so you cannot approve or reject your own transaction. Another officer must handle it."));
        }

        if ("posted".equals(status)) {
            ResponseEntity<?> channelCheck = ensureCollectionChannelAllowed(transaction.getTenantId(), transaction.getChannel());
            if (channelCheck != null) return channelCheck;
            Instant postingDate = Instant.now();
            if (periodService.isClosed(transaction.getTenantId(), postingDate)) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(ApiErrorResponse.of(
                                409,
                                "ACCOUNTING_PERIOD_CLOSED",
                                "Accounting period " + periodService.periodKey(postingDate) + " is closed."));
            }
            Member member = memberRepository.findById(transaction.getMemberId()).orElse(null);
            if (member == null) {
                return ResponseEntity.badRequest()
                        .body(ApiErrorResponse.of(400, "INVALID_MEMBER", "Member does not exist for this tenant."));
            }
            if ("withdrawal".equals(transaction.getType()) && !member.hasEnoughSavings(transaction.getAmount())) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(ApiErrorResponse.of(409, "INSUFFICIENT_SAVINGS", "Savings balance is too low for this withdrawal."));
            }
            member.applyPostedTransaction(transaction.getType(), transaction.getAmount());
            memberRepository.save(member);
            memberFundBalanceService.applyPosted(transaction.getTenantId(), member.getId(), transaction.getType(), transaction.getAmount());
            transaction.post(currentSession.user().getId());
            notificationService.notifyPaymentPosted(member, transaction.getType(), transaction.getAmount(), "financial_transaction", transaction.getId());
        } else {
            transaction.reject(currentSession.user().getId(), reason == null ? "" : reason.trim());
        }

        FinancialTransaction saved = transactionRepository.save(transaction);
        auditService.record(
                saved.getTenantId(),
                currentSession.user(),
                ("posted".equals(status) ? "Posted" : "Rejected") + " financial transaction " + saved.getReference(),
                "financial_transaction",
                saved.getId(),
                request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(FinancialTransactionResponse.from(saved)));
    }

    /**
     * A treasurer may only confirm (post) a collection on a channel the platform allows for the SACCO.
     * Cash and payroll are not online collection channels and are always allowed. Returns a rejection
     * response when the channel is not allowed, or {@code null} when the posting may proceed.
     */
    private ResponseEntity<?> ensureCollectionChannelAllowed(String tenantId, String channel) {
        if (!"mobile_money".equals(channel) && !"bank".equals(channel)) {
            return null;
        }
        TenantResponse tenant = tenantService.findById(tenantId).orElse(null);
        CollectionMode allowed = tenant == null ? CollectionMode.NONE : CollectionMode.fromStored(tenant.allowedCollectionMode());
        boolean ok = "mobile_money".equals(channel) ? allowed.allowsMobileMoney() : allowed.allowsBank();
        if (ok) {
            return null;
        }
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiErrorResponse.of(409, "COLLECTION_CHANNEL_NOT_ALLOWED",
                        "This SACCO is not allowed to collect via " + channel.replace('_', ' ') + ". Ask the platform to enable it."));
    }

    private ResponseEntity<?> reversePostedTransaction(
            FinancialTransaction original,
            String reason,
            AuthService.CurrentSession currentSession,
            HttpServletRequest request) {
        if (!canAccessTransaction(currentSession, original)) return transactionAccessDenied(currentSession, original);
        if (!"posted".equals(original.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "REVERSAL_NOT_AVAILABLE", "Only posted financial transactions can be reversed."));
        }
        if (original.getOriginalTransactionId() != null) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "REVERSAL_NOT_AVAILABLE", "Reversal transactions cannot be reversed."));
        }
        if (transactionRepository.existsByOriginalTransactionId(original.getId())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "TRANSACTION_ALREADY_REVERSED", "This transaction already has a reversal."));
        }
        Instant postingDate = Instant.now();
        if (periodService.isClosed(original.getTenantId(), postingDate)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(
                            409,
                            "ACCOUNTING_PERIOD_CLOSED",
                            "Accounting period " + periodService.periodKey(postingDate) + " is closed."));
        }

        Member member = memberRepository.findById(original.getMemberId()).orElse(null);
        if (member == null) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_MEMBER", "Member does not exist for this tenant."));
        }
        if (!member.canReverse(original.getType(), original.getAmount())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "INSUFFICIENT_BALANCE_FOR_REVERSAL", "Member balance is too low to reverse this transaction."));
        }

        member.applyReversal(original.getType(), original.getAmount());
        memberRepository.save(member);
        memberFundBalanceService.applyReversal(original.getTenantId(), member.getId(), original.getType(), original.getAmount());
        FinancialTransaction reversal = transactionRepository.save(FinancialTransaction.reversalOf(
                original,
                "txn_" + UUID.randomUUID(),
                original.getReference() + "-REV",
                reason,
                currentSession.user().getId()));
        auditService.record(
                reversal.getTenantId(),
                currentSession.user(),
                "Reversed financial transaction " + original.getReference(),
                "financial_transaction",
                reversal.getId(),
                request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(FinancialTransactionResponse.from(reversal)));
    }

    private ResponseEntity<?> receiptResponse(FinancialTransaction transaction, AuthService.CurrentSession currentSession) {
        if (!canAccessTransaction(currentSession, transaction)) return transactionAccessDenied(currentSession, transaction);
        if (!"posted".equals(transaction.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "RECEIPT_NOT_AVAILABLE", "Receipts are only available for posted transactions."));
        }

        TenantResponse tenant = tenantService.findById(transaction.getTenantId()).orElse(null);
        Branch branch = branchRepository.findById(transaction.getBranchId()).orElse(null);
        Member member = memberRepository.findById(transaction.getMemberId()).orElse(null);
        if (tenant == null || branch == null || member == null) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "RECEIPT_DATA_MISSING", "Receipt source data is incomplete."));
        }

        return ResponseEntity.ok(ApiResponse.of(FinancialTransactionReceiptResponse.from(
                transaction,
                tenant,
                branch,
                member,
                moneyFormatter.format(tenant, transaction.getAmount()),
                Instant.now())));
    }

    private String referenceForTenant(String tenantId) {
        String abbreviation = tenantService.findById(tenantId)
                .map(tenant -> tenant.abbreviation())
                .orElse("SACCO");
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase(Locale.ROOT);
        return abbreviation + "-TX-" + suffix;
    }

    private List<FinancialTransaction> postOpeningBalanceTransactions(
            String tenantId,
            OpeningBalanceImportRow row,
            Member member,
            String userId) {
        List<FinancialTransaction> created = new ArrayList<>();
        Instant postedAt = openingBalancePostedAt(row);
        createOpeningBalanceTransaction(created, tenantId, row, member, "savings_deposit", "SAV", amount(row.savingsBalance()), userId, postedAt);
        createOpeningBalanceTransaction(created, tenantId, row, member, "share_purchase", "SHR", amount(row.sharesBalance()), userId, postedAt);
        createOpeningBalanceTransaction(created, tenantId, row, member, "welfare_contribution", "WEL", amount(row.welfareBalance()), userId, postedAt);
        return created;
    }

    private void createOpeningBalanceTransaction(
            List<FinancialTransaction> created,
            String tenantId,
            OpeningBalanceImportRow row,
            Member member,
            String type,
            String suffix,
            BigDecimal amount,
            String userId,
            Instant postedAt) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) return;
        member.applyPostedTransaction(type, amount);
        memberFundBalanceService.applyPosted(tenantId, member.getId(), type, amount);
        created.add(transactionRepository.save(FinancialTransaction.postedProviderTransactionAt(
                "txn_" + UUID.randomUUID(),
                tenantId,
                member.getBranchId(),
                member.getId(),
                type,
                "bank",
                amount,
                openingBalanceReference(row, suffix),
                openingBalanceNarration(row, suffix),
                userId,
                postedAt)));
    }

    private List<OpeningBalanceImportError> validateOpeningBalanceRows(String tenantId, List<OpeningBalanceImportRow> rows) {
        List<OpeningBalanceImportError> errors = new ArrayList<>();
        if (rows.isEmpty()) {
            errors.add(new OpeningBalanceImportError(0, "rows", "IMPORT_EMPTY", "At least one opening balance row is required."));
            return errors;
        }
        if (rows.size() > 500) {
            errors.add(new OpeningBalanceImportError(0, "rows", "IMPORT_TOO_LARGE", "A single opening balance import cannot exceed 500 rows."));
            return errors;
        }

        Set<String> seenMembershipNos = new HashSet<>();
        Set<String> seenReferences = new HashSet<>();
        for (int index = 0; index < rows.size(); index++) {
            int rowNumber = index + 1;
            OpeningBalanceImportRow row = rows.get(index);
            if (row.membershipNo() == null || row.membershipNo().isBlank()) {
                errors.add(new OpeningBalanceImportError(rowNumber, "membershipNo", "REQUIRED", "Membership number is required."));
            } else {
                String membershipNo = row.membershipNo().trim().toUpperCase(Locale.ROOT);
                if (!seenMembershipNos.add(membershipNo)) {
                    errors.add(new OpeningBalanceImportError(rowNumber, "membershipNo", "DUPLICATE_IN_FILE", "Membership number is repeated in this import."));
                }
                if (memberRepository.findFirstByTenantIdAndMembershipNoIgnoreCase(tenantId, membershipNo).isEmpty()) {
                    errors.add(new OpeningBalanceImportError(rowNumber, "membershipNo", "INVALID_MEMBER", "Member does not exist for this tenant."));
                }
            }

            BigDecimal savings = validatedAmount(rowNumber, "savingsBalance", row.savingsBalance(), errors);
            BigDecimal shares = validatedAmount(rowNumber, "sharesBalance", row.sharesBalance(), errors);
            BigDecimal welfare = validatedAmount(rowNumber, "welfareBalance", row.welfareBalance(), errors);
            if (savings.add(shares).add(welfare).compareTo(BigDecimal.ZERO) <= 0) {
                errors.add(new OpeningBalanceImportError(rowNumber, "balances", "NO_OPENING_BALANCE", "At least one opening balance amount must be greater than zero."));
            }

            for (String suffix : List.of("SAV", "SHR", "WEL")) {
                String reference = openingBalanceReference(row, suffix);
                if (!seenReferences.add(reference.toUpperCase(Locale.ROOT))) {
                    errors.add(new OpeningBalanceImportError(rowNumber, "reference", "DUPLICATE_REFERENCE_IN_FILE", "Opening balance reference is repeated in this import."));
                }
                if (transactionRepository.existsByTenantIdAndReferenceIgnoreCase(tenantId, reference)) {
                    errors.add(new OpeningBalanceImportError(rowNumber, "reference", "REFERENCE_EXISTS", "Opening balance reference already exists."));
                }
            }

            if (row.postingDate() != null && !row.postingDate().isBlank()) {
                try {
                    Instant postingDate = openingBalancePostedAt(row);
                    if (periodService.isClosed(tenantId, postingDate)) {
                        errors.add(new OpeningBalanceImportError(rowNumber, "postingDate", "ACCOUNTING_PERIOD_CLOSED", "Opening balance posting date falls in a closed accounting period."));
                    }
                } catch (DateTimeParseException error) {
                    errors.add(new OpeningBalanceImportError(rowNumber, "postingDate", "INVALID_DATE", "Posting date must use YYYY-MM-DD format."));
                }
            }
        }
        return errors;
    }

    private Instant openingBalancePostedAt(OpeningBalanceImportRow row) {
        LocalDate postingDate = row.postingDate() == null || row.postingDate().isBlank()
                ? LocalDate.now()
                : LocalDate.parse(row.postingDate().trim());
        return postingDate.atStartOfDay(ZoneOffset.UTC).toInstant();
    }

    private BigDecimal validatedAmount(int rowNumber, String field, String value, List<OpeningBalanceImportError> errors) {
        try {
            BigDecimal amount = amount(value);
            if (amount.compareTo(BigDecimal.ZERO) < 0) {
                errors.add(new OpeningBalanceImportError(rowNumber, field, "NEGATIVE_AMOUNT", "Opening balance cannot be negative."));
            }
            return amount;
        } catch (NumberFormatException error) {
            errors.add(new OpeningBalanceImportError(rowNumber, field, "INVALID_AMOUNT", "Opening balance amount must be numeric."));
            return BigDecimal.ZERO;
        }
    }

    private BigDecimal amount(String value) {
        return Money.parse(value);
    }

    private String openingBalanceReference(OpeningBalanceImportRow row, String suffix) {
        String base = row.reference() == null || row.reference().isBlank()
                ? "OB-" + row.membershipNo().trim().toUpperCase(Locale.ROOT)
                : row.reference().trim().toUpperCase(Locale.ROOT);
        return base + "-" + suffix;
    }

    private String openingBalanceNarration(OpeningBalanceImportRow row, String suffix) {
        String label = switch (suffix) {
            case "SAV" -> "savings";
            case "SHR" -> "shares";
            default -> "welfare";
        };
        return (row.narration() == null || row.narration().isBlank()
                ? "Opening " + label + " balance"
                : row.narration().trim() + " - " + label);
    }

    private String openingBalanceCsvTemplate(List<OpeningBalanceImportRow> sampleRows) {
        String header = String.join(",", OPENING_BALANCE_IMPORT_HEADERS);
        List<String> rows = sampleRows.stream()
                .map(row -> String.join(",",
                        csv(row.membershipNo()),
                        csv(row.savingsBalance()),
                        csv(row.sharesBalance()),
                        csv(row.welfareBalance()),
                        csv(row.reference()),
                        csv(row.postingDate()),
                        csv(row.narration())))
                .toList();
        return header + "\n" + String.join("\n", rows) + "\n";
    }

    private String csv(String value) {
        if (value == null) return "";
        if (!value.contains(",") && !value.contains("\"") && !value.contains("\n")) return value;
        return "\"" + value.replace("\"", "\"\"") + "\"";
    }

    private String tenantScope(AuthService.CurrentSession currentSession, String requestedTenantId) {
        String tenantId = requestedTenantId == null || requestedTenantId.isBlank()
                ? currentSession.user().getTenantId()
                : requestedTenantId.trim();
        if (!canAccess(currentSession, tenantId)) return null;
        return tenantId;
    }

    private boolean canAccess(AuthService.CurrentSession currentSession, String tenantId) {
        return authService.isPlatform(currentSession.user()) || tenantId.equals(currentSession.user().getTenantId());
    }

    private List<String> branchScope(AuthService.CurrentSession currentSession, String tenantId) {
        if (authService.isPlatform(currentSession.user()) || authService.hasPermission(currentSession.user(), "tenants:manage")) {
            return List.of();
        }
        return branchRepository.findByTenantIdAndManagerUserIdOrderByCodeAsc(tenantId, currentSession.user().getId()).stream()
                .map(Branch::getId)
                .toList();
    }

    private boolean canAccessTransaction(AuthService.CurrentSession currentSession, FinancialTransaction transaction) {
        return canAccess(currentSession, transaction.getTenantId())
                && canAccessBranch(currentSession, transaction.getTenantId(), transaction.getBranchId());
    }

    private boolean canAccessBranch(AuthService.CurrentSession currentSession, String tenantId, String branchId) {
        List<String> scopedBranchIds = branchScope(currentSession, tenantId);
        return scopedBranchIds.isEmpty() || scopedBranchIds.contains(branchId);
    }

    private ResponseEntity<ApiErrorResponse> tenantAccessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access financial transactions for another tenant."));
    }

    private ResponseEntity<ApiErrorResponse> transactionAccessDenied(AuthService.CurrentSession currentSession, FinancialTransaction transaction) {
        return canAccess(currentSession, transaction.getTenantId()) ? branchAccessDenied() : tenantAccessDenied();
    }

    private ResponseEntity<ApiErrorResponse> branchAccessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "BRANCH_ACCESS_DENIED", "Cannot access financial transactions outside assigned branch scope."));
    }

    private String searchTerm(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }

    private String searchable(String... values) {
        return String.join(" ", java.util.Arrays.stream(values)
                .map(value -> value == null ? "" : value)
                .toList()).toLowerCase(Locale.ROOT);
    }

    private Sort sortBy(boolean platformAll, String requestedSort, String requestedDirection, Map<String, String> allowed, String fallback, Sort.Direction fallbackDirection) {
        String property = allowed.getOrDefault(requestedSort == null ? "" : requestedSort.trim(), fallback);
        Sort.Direction resolvedDirection = requestedDirection == null || requestedDirection.isBlank()
                ? fallbackDirection
                : ("desc".equalsIgnoreCase(requestedDirection) ? Sort.Direction.DESC : Sort.Direction.ASC);
        Sort sort = Sort.by(resolvedDirection, property);
        return platformAll && !"tenantId".equals(property) ? Sort.by(Sort.Direction.ASC, "tenantId").and(sort) : sort;
    }

    record CreateTransactionRequest(
            String tenantId,
            String branchId,
            @NotBlank String memberId,
            @NotBlank String type,
            @NotBlank String channel,
            @NotNull BigDecimal amount,
            String narration) {
    }

    record UpdateTransactionStatusRequest(@NotBlank String status, String reason) {
    }

    record ReverseTransactionRequest(@NotBlank String reason) {
    }

    record OpeningBalanceImportTemplateResponse(
            String tenantId,
            String filename,
            String contentType,
            List<String> headers,
            List<OpeningBalanceImportRow> sampleRows,
            String csv) {
    }

    record OpeningBalanceImportRequest(
            String tenantId,
            Boolean dryRun,
            List<OpeningBalanceImportRow> rows) {
    }

    record OpeningBalanceImportRow(
            String membershipNo,
            String savingsBalance,
            String sharesBalance,
            String welfareBalance,
            String reference,
            String postingDate,
            String narration) {
    }

    record OpeningBalanceImportError(
            int row,
            String field,
            String code,
            String message) {
    }

    record OpeningBalanceImportResult(
            String tenantId,
            boolean dryRun,
            boolean valid,
            int totalRows,
            int createdCount,
            int skippedCount,
            List<OpeningBalanceImportError> errors,
            List<FinancialTransactionResponse> createdTransactions) {
    }
}
