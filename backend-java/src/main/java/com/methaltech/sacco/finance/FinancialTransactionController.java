package com.methaltech.sacco.finance;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.accounting.AccountingPeriodService;
import com.methaltech.sacco.branch.Branch;
import com.methaltech.sacco.branch.BranchRepository;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberRepository;
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
import java.util.Set;
import java.util.UUID;
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
    private final AuthService authService;
    private final AuditService auditService;
    private final AccountingPeriodService periodService;

    FinancialTransactionController(
            FinancialTransactionRepository transactionRepository,
            MemberRepository memberRepository,
            BranchRepository branchRepository,
            TenantService tenantService,
            AuthService authService,
            AuditService auditService,
            AccountingPeriodService periodService) {
        this.transactionRepository = transactionRepository;
        this.memberRepository = memberRepository;
        this.branchRepository = branchRepository;
        this.tenantService = tenantService;
        this.authService = authService;
        this.auditService = auditService;
        this.periodService = periodService;
    }

    @GetMapping
    ResponseEntity<?> listTransactions(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "transactions:view")) {
            return authService.permissionRequired("transactions:view");
        }

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null) return tenantAccessDenied();

        List<FinancialTransaction> transactions = authService.isPlatform(currentSession.user()) && requestedTenantId == null
                ? transactionRepository.findAllByOrderByTenantIdAscCreatedAtDesc()
                : transactionRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);

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
        if (branchRepository.findById(branchId)
                .filter(branch -> branch.getTenantId().equals(tenantId))
                .isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_BRANCH", "Branch does not exist for this tenant."));
        }

        String type = body.type().trim();
        if (!ALLOWED_TYPES.contains(type)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_TRANSACTION_TYPE", "Unsupported transaction type."));
        }

        String channel = body.channel().trim();
        if (!ALLOWED_CHANNELS.contains(channel)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_PAYMENT_CHANNEL", "Unsupported payment channel."));
        }

        if (body.amount().compareTo(BigDecimal.ZERO) <= 0) {
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
                body.amount(),
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
        if (!canAccess(currentSession, transaction.getTenantId())) return tenantAccessDenied();
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

        if ("posted".equals(status)) {
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
            transaction.post(currentSession.user().getId());
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

    private ResponseEntity<?> reversePostedTransaction(
            FinancialTransaction original,
            String reason,
            AuthService.CurrentSession currentSession,
            HttpServletRequest request) {
        if (!canAccess(currentSession, original.getTenantId())) return tenantAccessDenied();
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
        if (!canAccess(currentSession, transaction.getTenantId())) return tenantAccessDenied();
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
                Instant.now())));
    }

    private String referenceForTenant(String tenantId) {
        String abbreviation = tenantService.findById(tenantId)
                .map(tenant -> tenant.abbreviation())
                .orElse("SACCO");
        long next = transactionRepository.countByTenantId(tenantId) + 1;
        return abbreviation + "-TX-" + String.format("%04d", next);
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
        return value == null || value.isBlank() ? BigDecimal.ZERO : new BigDecimal(value.trim());
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

    private ResponseEntity<ApiErrorResponse> tenantAccessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access financial transactions for another tenant."));
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
