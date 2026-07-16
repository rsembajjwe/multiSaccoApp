package com.methaltech.sacco.member;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.finance.FinancialTransaction;
import com.methaltech.sacco.finance.FinancialTransactionRepository;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.security.PasswordHasher;
import com.methaltech.sacco.tenant.TenantService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
@RequestMapping("/api/v1/members")
class MemberController {

    private static final List<String> MEMBER_IMPORT_HEADERS = List.of(
            "membershipNo",
            "branchId",
            "fullName",
            "memberType",
            "phone",
            "email",
            "nationalId",
            "kycStatus",
            "joiningDate",
            "password");
    private static final Set<String> ALLOWED_MEMBER_TYPES = Set.of("individual", "group", "institutional", "corporate");
    private static final Set<String> ALLOWED_KYC_STATUSES = Set.of(
            "not_verified",
            "pending_verification",
            "verified",
            "rejected",
            "expired");
    private static final Set<String> ALLOWED_MEMBER_STATUSES = Set.of(
            "applicant",
            "pending_approval",
            "active",
            "inactive",
            "dormant",
            "suspended",
            "exited");
    private static final Set<String> ALLOWED_DOCUMENT_TYPES = Set.of(
            "national_id",
            "photo",
            "signature",
            "bylaws",
            "registration_certificate",
            "other");

    private final MemberRepository memberRepository;
    private final MemberDocumentRepository memberDocumentRepository;
    private final MemberNextOfKinRepository memberNextOfKinRepository;
    private final MemberBeneficiaryRepository memberBeneficiaryRepository;
    private final FinancialTransactionRepository financialTransactionRepository;
    private final BranchLookup branchLookup;
    private final TenantService tenantService;
    private final AuthService authService;
    private final AuditService auditService;
    private final PasswordHasher passwordHasher;

    MemberController(
            MemberRepository memberRepository,
            MemberDocumentRepository memberDocumentRepository,
            MemberNextOfKinRepository memberNextOfKinRepository,
            MemberBeneficiaryRepository memberBeneficiaryRepository,
            FinancialTransactionRepository financialTransactionRepository,
            BranchLookup branchLookup,
            TenantService tenantService,
            AuthService authService,
            AuditService auditService,
            PasswordHasher passwordHasher) {
        this.memberRepository = memberRepository;
        this.memberDocumentRepository = memberDocumentRepository;
        this.memberNextOfKinRepository = memberNextOfKinRepository;
        this.memberBeneficiaryRepository = memberBeneficiaryRepository;
        this.financialTransactionRepository = financialTransactionRepository;
        this.branchLookup = branchLookup;
        this.tenantService = tenantService;
        this.authService = authService;
        this.auditService = auditService;
        this.passwordHasher = passwordHasher;
    }

    @GetMapping
    ResponseEntity<?> listMembers(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null) return tenantAccessDenied();

        List<Member> members = authService.isPlatform(currentSession.user()) && requestedTenantId == null
                ? memberRepository.findAllByOrderByTenantIdAscMembershipNoAsc()
                : memberRepository.findByTenantIdOrderByMembershipNoAsc(tenantId);

        return ResponseEntity.ok(ApiResponse.of(members.stream().map(MemberResponse::from).toList()));
    }

    @GetMapping("/import-template")
    ResponseEntity<?> memberImportTemplate(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null) return tenantAccessDenied();

        String defaultBranchId = branchLookup.defaultBranchId(tenantId).orElse("");
        String nextMembershipNo = membershipNo(tenantId, null);
        List<MemberImportSampleRow> sampleRows = List.of(new MemberImportSampleRow(
                nextMembershipNo,
                defaultBranchId,
                "Sample Member",
                "individual",
                "+256700000000",
                "sample.member@example.local",
                "CM0000000SAMP",
                "pending_verification",
                LocalDate.now(),
                "Member@12345"));

        return ResponseEntity.ok(ApiResponse.of(new MemberImportTemplateResponse(
                tenantId,
                "member-import-template-" + tenantId + ".csv",
                "text/csv",
                MEMBER_IMPORT_HEADERS,
                sampleRows,
                csvTemplate(sampleRows))));
    }

    @PostMapping
    ResponseEntity<?> createMember(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody CreateMemberRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String tenantId = tenantScope(currentSession, body.tenantId());
        if (tenantId == null) return tenantAccessDenied();

        if (!branchLookup.existsInTenant(body.branchId(), tenantId)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_BRANCH", "Branch does not exist for this tenant."));
        }

        String memberType = normalizedOrDefault(body.memberType(), "individual");
        if (!ALLOWED_MEMBER_TYPES.contains(memberType)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_MEMBER_TYPE", "Unsupported member type."));
        }

        String kycStatus = normalizedOrDefault(body.kycStatus(), "pending_verification");
        if (!ALLOWED_KYC_STATUSES.contains(kycStatus)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_KYC_STATUS", "Unsupported KYC status."));
        }

        String membershipNo = membershipNo(tenantId, body.membershipNo());
        if (memberRepository.existsByTenantIdAndMembershipNoIgnoreCase(tenantId, membershipNo)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "MEMBER_EXISTS", "A member with that membership number already exists."));
        }

        PasswordHasher.PasswordHash password = passwordHasher.hash(
                body.password() == null || body.password().isBlank() ? "Member@12345" : body.password());
        Member member = memberRepository.save(new Member(
                "member_" + UUID.randomUUID(),
                tenantId,
                body.branchId().trim(),
                membershipNo,
                body.fullName().trim(),
                memberType,
                body.phone().trim(),
                blankToDefault(body.email()),
                blankToDefault(body.nationalId()),
                password.hash(),
                password.salt(),
                "pending_approval",
                kycStatus,
                body.joiningDate() == null ? LocalDate.now() : body.joiningDate()));

        auditService.record(
                tenantId,
                currentSession.user(),
                "Registered member " + member.getMembershipNo(),
                "member",
                member.getId(),
                request.getRemoteAddr());

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(MemberResponse.from(member)));
    }

    @GetMapping("/{memberId}")
    ResponseEntity<?> getMember(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String memberId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        return memberRepository.findById(memberId)
                .<ResponseEntity<?>>map(member -> {
                    if (!canAccess(currentSession, member.getTenantId())) return tenantAccessDenied();
                    return ResponseEntity.ok(ApiResponse.of(MemberResponse.from(member)));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "MEMBER_NOT_FOUND", "Member not found.")));
    }

    @GetMapping("/{memberId}/statement")
    ResponseEntity<?> getMemberStatement(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String memberId,
            @RequestParam(name = "from", required = false) LocalDate from,
            @RequestParam(name = "to", required = false) LocalDate to) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        if (from != null && to != null && from.isAfter(to)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_STATEMENT_RANGE", "Statement start date cannot be after end date."));
        }

        return memberRepository.findById(memberId)
                .<ResponseEntity<?>>map(member -> {
                    if (!canAccess(currentSession, member.getTenantId())) return tenantAccessDenied();
                    return ResponseEntity.ok(ApiResponse.of(statementFor(member, from, to)));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "MEMBER_NOT_FOUND", "Member not found.")));
    }

    @GetMapping("/{memberId}/next-of-kin")
    ResponseEntity<?> listNextOfKin(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String memberId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        return memberRepository.findById(memberId)
                .<ResponseEntity<?>>map(member -> {
                    if (!canAccess(currentSession, member.getTenantId())) return tenantAccessDenied();
                    return ResponseEntity.ok(ApiResponse.of(memberNextOfKinRepository.findByMemberIdOrderByCreatedAtDesc(memberId).stream()
                            .map(MemberNextOfKinResponse::from)
                            .toList()));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "MEMBER_NOT_FOUND", "Member not found.")));
    }

    @PostMapping("/{memberId}/next-of-kin")
    ResponseEntity<?> createNextOfKin(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String memberId,
            @Valid @RequestBody CreateNextOfKinRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        return memberRepository.findById(memberId)
                .<ResponseEntity<?>>map(member -> {
                    if (!canAccess(currentSession, member.getTenantId())) return tenantAccessDenied();
                    MemberNextOfKin nextOfKin = memberNextOfKinRepository.save(new MemberNextOfKin(
                            "kin_" + UUID.randomUUID(),
                            member.getTenantId(),
                            member.getId(),
                            body.fullName().trim(),
                            body.relationship().trim().toLowerCase(),
                            body.phone().trim(),
                            blankToDefault(body.address()),
                            body.primaryContact() != null && body.primaryContact(),
                            currentSession.user().getId()));
                    auditService.record(
                            member.getTenantId(),
                            currentSession.user(),
                            "Added next of kin for member " + member.getMembershipNo(),
                            "member_next_of_kin",
                            nextOfKin.getId(),
                            request.getRemoteAddr());
                    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(MemberNextOfKinResponse.from(nextOfKin)));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "MEMBER_NOT_FOUND", "Member not found.")));
    }

    @GetMapping("/{memberId}/beneficiaries")
    ResponseEntity<?> listBeneficiaries(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String memberId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        return memberRepository.findById(memberId)
                .<ResponseEntity<?>>map(member -> {
                    if (!canAccess(currentSession, member.getTenantId())) return tenantAccessDenied();
                    return ResponseEntity.ok(ApiResponse.of(memberBeneficiaryRepository.findByMemberIdOrderByCreatedAtDesc(memberId).stream()
                            .map(MemberBeneficiaryResponse::from)
                            .toList()));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "MEMBER_NOT_FOUND", "Member not found.")));
    }

    @PostMapping("/{memberId}/beneficiaries")
    ResponseEntity<?> createBeneficiary(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String memberId,
            @Valid @RequestBody CreateBeneficiaryRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        BigDecimal allocationPercent = body.allocationPercent().stripTrailingZeros();
        if (allocationPercent.compareTo(BigDecimal.ZERO) <= 0 || allocationPercent.compareTo(new BigDecimal("100")) > 0) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_ALLOCATION", "Beneficiary allocation must be greater than 0 and not exceed 100."));
        }

        return memberRepository.findById(memberId)
                .<ResponseEntity<?>>map(member -> {
                    if (!canAccess(currentSession, member.getTenantId())) return tenantAccessDenied();
                    BigDecimal allocated = memberBeneficiaryRepository.findByMemberIdOrderByCreatedAtDesc(memberId).stream()
                            .map(MemberBeneficiary::getAllocationPercent)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    if (allocated.add(allocationPercent).compareTo(new BigDecimal("100")) > 0) {
                        return ResponseEntity.badRequest()
                                .body(ApiErrorResponse.of(400, "ALLOCATION_EXCEEDED", "Beneficiary allocations cannot exceed 100 percent."));
                    }
                    MemberBeneficiary beneficiary = memberBeneficiaryRepository.save(new MemberBeneficiary(
                            "beneficiary_" + UUID.randomUUID(),
                            member.getTenantId(),
                            member.getId(),
                            body.fullName().trim(),
                            body.relationship().trim().toLowerCase(),
                            blankToDefault(body.phone()),
                            allocationPercent,
                            currentSession.user().getId()));
                    auditService.record(
                            member.getTenantId(),
                            currentSession.user(),
                            "Added beneficiary for member " + member.getMembershipNo(),
                            "member_beneficiary",
                            beneficiary.getId(),
                            request.getRemoteAddr());
                    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(MemberBeneficiaryResponse.from(beneficiary)));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "MEMBER_NOT_FOUND", "Member not found.")));
    }

    @GetMapping("/{memberId}/documents")
    ResponseEntity<?> listMemberDocuments(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String memberId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        return memberRepository.findById(memberId)
                .<ResponseEntity<?>>map(member -> {
                    if (!canAccess(currentSession, member.getTenantId())) return tenantAccessDenied();
                    return ResponseEntity.ok(ApiResponse.of(memberDocumentRepository.findByMemberIdOrderByCreatedAtDesc(memberId).stream()
                            .map(MemberDocumentResponse::from)
                            .toList()));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "MEMBER_NOT_FOUND", "Member not found.")));
    }

    @PostMapping("/{memberId}/documents")
    ResponseEntity<?> createMemberDocument(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String memberId,
            @Valid @RequestBody CreateMemberDocumentRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String documentType = normalizedOrDefault(body.documentType(), "");
        if (!ALLOWED_DOCUMENT_TYPES.contains(documentType)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_DOCUMENT_TYPE", "Unsupported member document type."));
        }
        String verificationStatus = normalizedOrDefault(body.verificationStatus(), "pending_verification");
        if (!ALLOWED_KYC_STATUSES.contains(verificationStatus)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_DOCUMENT_STATUS", "Unsupported member document status."));
        }

        return memberRepository.findById(memberId)
                .<ResponseEntity<?>>map(member -> {
                    if (!canAccess(currentSession, member.getTenantId())) return tenantAccessDenied();
                    MemberDocument document = memberDocumentRepository.save(new MemberDocument(
                            "member_document_" + UUID.randomUUID(),
                            member.getTenantId(),
                            member.getId(),
                            documentType,
                            body.storageKey().trim(),
                            verificationStatus,
                            currentSession.user().getId()));
                    auditService.record(
                            member.getTenantId(),
                            currentSession.user(),
                            "Uploaded " + document.getDocumentType() + " for member " + member.getMembershipNo(),
                            "member_document",
                            document.getId(),
                            request.getRemoteAddr());
                    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(MemberDocumentResponse.from(document)));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "MEMBER_NOT_FOUND", "Member not found.")));
    }

    @PatchMapping("/{memberId}/status")
    ResponseEntity<?> updateMemberStatus(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String memberId,
            @Valid @RequestBody UpdateMemberStatusRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String status = body.status().trim();
        if (!ALLOWED_MEMBER_STATUSES.contains(status)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_MEMBER_STATUS", "Unsupported member status."));
        }

        return memberRepository.findById(memberId)
                .<ResponseEntity<?>>map(member -> {
                    if (!canAccess(currentSession, member.getTenantId())) return tenantAccessDenied();
                    member.updateStatus(status);
                    Member saved = memberRepository.save(member);
                    auditService.record(
                            saved.getTenantId(),
                            currentSession.user(),
                            "Updated member " + saved.getMembershipNo() + " status to " + status,
                            "member",
                            saved.getId(),
                            request.getRemoteAddr());
                    return ResponseEntity.ok(ApiResponse.of(MemberResponse.from(saved)));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "MEMBER_NOT_FOUND", "Member not found.")));
    }

    private String membershipNo(String tenantId, String requestedMembershipNo) {
        if (requestedMembershipNo != null && !requestedMembershipNo.isBlank()) {
            return requestedMembershipNo.trim().toUpperCase();
        }
        String abbreviation = tenantService.findById(tenantId)
                .map(tenant -> tenant.abbreviation())
                .orElse("SACCO");
        long next = memberRepository.countByTenantId(tenantId) + 1;
        return abbreviation + "-" + String.format("%04d", next);
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
                .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access members for another tenant."));
    }

    private String normalizedOrDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim().toLowerCase();
    }

    private String blankToDefault(String value) {
        return value == null || value.isBlank() ? "" : value.trim();
    }

    private String csvTemplate(List<MemberImportSampleRow> sampleRows) {
        String header = String.join(",", MEMBER_IMPORT_HEADERS);
        List<String> rows = sampleRows.stream()
                .map(row -> String.join(",",
                        csv(row.membershipNo()),
                        csv(row.branchId()),
                        csv(row.fullName()),
                        csv(row.memberType()),
                        csv(row.phone()),
                        csv(row.email()),
                        csv(row.nationalId()),
                        csv(row.kycStatus()),
                        csv(row.joiningDate().toString()),
                        csv(row.password())))
                .toList();
        return header + "\n" + String.join("\n", rows) + "\n";
    }

    private String csv(String value) {
        if (value == null) return "";
        if (!value.contains(",") && !value.contains("\"") && !value.contains("\n")) return value;
        return "\"" + value.replace("\"", "\"\"") + "\"";
    }

    private MemberStatementResponse statementFor(Member member, LocalDate from, LocalDate to) {
        List<FinancialTransaction> postedTransactions = financialTransactionRepository
                .findByMemberIdAndStatusOrderByPostedAtAscCreatedAtAsc(member.getId(), "posted")
                .stream()
                .sorted(Comparator.comparing(this::effectivePostedAt))
                .toList();
        List<FinancialTransaction> includedTransactions = postedTransactions.stream()
                .filter(transaction -> inStatementRange(transaction, from, to))
                .toList();

        BigDecimal openingSavings = member.getSavingsBalance().subtract(netMovement(postedTransactions, "savings"));
        BigDecimal openingShares = member.getSharesBalance().subtract(netMovement(postedTransactions, "shares"));
        BigDecimal openingWelfare = member.getWelfareBalance().subtract(netMovement(postedTransactions, "welfare"));
        for (FinancialTransaction transaction : postedTransactions.stream()
                .filter(transaction -> beforeStatementRange(transaction, from))
                .toList()) {
            openingSavings = openingSavings.add(movement(transaction, "savings"));
            openingShares = openingShares.add(movement(transaction, "shares"));
            openingWelfare = openingWelfare.add(movement(transaction, "welfare"));
        }

        BigDecimal savings = openingSavings;
        BigDecimal shares = openingShares;
        BigDecimal welfare = openingWelfare;
        List<MemberStatementResponse.MemberStatementLine> lines = new java.util.ArrayList<>();
        for (FinancialTransaction transaction : includedTransactions) {
            BigDecimal savingsMovement = movement(transaction, "savings");
            BigDecimal sharesMovement = movement(transaction, "shares");
            BigDecimal welfareMovement = movement(transaction, "welfare");
            savings = savings.add(savingsMovement);
            shares = shares.add(sharesMovement);
            welfare = welfare.add(welfareMovement);
            lines.add(new MemberStatementResponse.MemberStatementLine(
                    transaction.getId(),
                    transaction.getReference(),
                    transaction.getType(),
                    transaction.getChannel(),
                    transaction.getOriginalTransactionId() == null ? transaction.getAmount() : transaction.getAmount().negate(),
                    savingsMovement,
                    sharesMovement,
                    welfareMovement,
                    savings,
                    shares,
                    welfare,
                    transaction.getNarration(),
                    transaction.getOriginalTransactionId(),
                    effectivePostedAt(transaction)));
        }

        MemberStatementResponse.StatementBalances opening = new MemberStatementResponse.StatementBalances(openingSavings, openingShares, openingWelfare);
        MemberStatementResponse.StatementBalances closing = new MemberStatementResponse.StatementBalances(savings, shares, welfare);
        return new MemberStatementResponse(
                member.getTenantId(),
                member.getId(),
                member.getMembershipNo(),
                member.getFullName(),
                from,
                to,
                opening,
                closing,
                lines,
                statementCsv(member, opening, closing, lines));
    }

    private BigDecimal netMovement(List<FinancialTransaction> transactions, String account) {
        return transactions.stream().map(transaction -> movement(transaction, account)).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal movement(FinancialTransaction transaction, String account) {
        BigDecimal amount = transaction.getOriginalTransactionId() == null ? transaction.getAmount() : transaction.getAmount().negate();
        if ("savings".equals(account) && "savings_deposit".equals(transaction.getType())) return amount;
        if ("savings".equals(account) && "withdrawal".equals(transaction.getType())) return amount.negate();
        if ("shares".equals(account) && "share_purchase".equals(transaction.getType())) return amount;
        if ("welfare".equals(account) && "welfare_contribution".equals(transaction.getType())) return amount;
        return BigDecimal.ZERO;
    }

    private boolean inStatementRange(FinancialTransaction transaction, LocalDate from, LocalDate to) {
        LocalDate postedDate = effectivePostedAt(transaction).atZone(ZoneOffset.UTC).toLocalDate();
        if (from != null && postedDate.isBefore(from)) return false;
        return to == null || !postedDate.isAfter(to);
    }

    private boolean beforeStatementRange(FinancialTransaction transaction, LocalDate from) {
        if (from == null) return false;
        return effectivePostedAt(transaction).atZone(ZoneOffset.UTC).toLocalDate().isBefore(from);
    }

    private Instant effectivePostedAt(FinancialTransaction transaction) {
        return transaction.getPostedAt() == null ? transaction.getUpdatedAt() : transaction.getPostedAt();
    }

    private String statementCsv(
            Member member,
            MemberStatementResponse.StatementBalances opening,
            MemberStatementResponse.StatementBalances closing,
            List<MemberStatementResponse.MemberStatementLine> lines) {
        List<String> rows = new java.util.ArrayList<>();
        rows.add("membershipNo,memberName,reference,type,channel,amount,savingsMovement,sharesMovement,welfareMovement,savingsBalance,sharesBalance,welfareBalance,postedAt");
        rows.add(String.join(",",
                csv(member.getMembershipNo()),
                csv(member.getFullName()),
                "OPENING",
                "opening",
                "",
                "0",
                "0",
                "0",
                "0",
                opening.savings().toPlainString(),
                opening.shares().toPlainString(),
                opening.welfare().toPlainString(),
                ""));
        for (MemberStatementResponse.MemberStatementLine line : lines) {
            rows.add(String.join(",",
                    csv(member.getMembershipNo()),
                    csv(member.getFullName()),
                    csv(line.reference()),
                    csv(line.type()),
                    csv(line.channel()),
                    line.amount().toPlainString(),
                    line.savingsMovement().toPlainString(),
                    line.sharesMovement().toPlainString(),
                    line.welfareMovement().toPlainString(),
                    line.savingsBalance().toPlainString(),
                    line.sharesBalance().toPlainString(),
                    line.welfareBalance().toPlainString(),
                    line.postedAt().toString()));
        }
        rows.add(String.join(",",
                csv(member.getMembershipNo()),
                csv(member.getFullName()),
                "CLOSING",
                "closing",
                "",
                "0",
                "0",
                "0",
                "0",
                closing.savings().toPlainString(),
                closing.shares().toPlainString(),
                closing.welfare().toPlainString(),
                ""));
        return String.join("\n", rows) + "\n";
    }

    record CreateMemberRequest(
            String tenantId,
            @NotBlank String branchId,
            String membershipNo,
            @NotBlank String fullName,
            String memberType,
            @NotBlank String phone,
            String email,
            String nationalId,
            String password,
            String kycStatus,
            LocalDate joiningDate) {
    }

    record UpdateMemberStatusRequest(@NotBlank String status) {
    }

    record CreateMemberDocumentRequest(
            @NotBlank String documentType,
            @NotBlank String storageKey,
            String verificationStatus) {
    }

    record CreateNextOfKinRequest(
            @NotBlank String fullName,
            @NotBlank String relationship,
            @NotBlank String phone,
            String address,
            Boolean primaryContact) {
    }

    record CreateBeneficiaryRequest(
            @NotBlank String fullName,
            @NotBlank String relationship,
            String phone,
            @NotNull BigDecimal allocationPercent) {
    }

    record MemberImportTemplateResponse(
            String tenantId,
            String filename,
            String contentType,
            List<String> headers,
            List<MemberImportSampleRow> sampleRows,
            String csv) {
    }

    record MemberImportSampleRow(
            String membershipNo,
            String branchId,
            String fullName,
            String memberType,
            String phone,
            String email,
            String nationalId,
            String kycStatus,
            LocalDate joiningDate,
            String password) {
    }
}
