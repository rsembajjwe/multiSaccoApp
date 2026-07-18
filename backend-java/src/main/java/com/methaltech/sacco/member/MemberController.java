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
import java.time.format.DateTimeParseException;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
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
import org.springframework.transaction.annotation.Transactional;

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
    private static final List<String> MEMBER_METADATA_IMPORT_HEADERS = List.of(
            "recordType",
            "membershipNo",
            "fullName",
            "relationship",
            "phone",
            "address",
            "primaryContact",
            "allocationPercent",
            "documentType",
            "storageKey",
            "verificationStatus",
            "kycStatus");
    private static final Set<String> ALLOWED_METADATA_RECORD_TYPES = Set.of(
            "next_of_kin",
            "beneficiary",
            "document",
            "kyc_status");
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

    @PostMapping("/import")
    ResponseEntity<?> importMembers(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody MemberImportRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String tenantId = tenantScope(currentSession, body.tenantId());
        if (tenantId == null) return tenantAccessDenied();

        List<MemberImportRow> rows = body.rows() == null ? List.of() : body.rows();
        boolean dryRun = body.dryRun() == null || body.dryRun();
        List<MemberImportError> errors = validateImportRows(tenantId, rows);
        if (!errors.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.of(new MemberImportResult(
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
            return ResponseEntity.ok(ApiResponse.of(new MemberImportResult(
                    tenantId,
                    true,
                    true,
                    rows.size(),
                    0,
                    0,
                    List.of(),
                    List.of())));
        }

        List<Member> createdMembers = new ArrayList<>();
        for (MemberImportRow row : rows) {
            PasswordHasher.PasswordHash password = passwordHasher.hash(row.password().trim());
            createdMembers.add(memberRepository.save(new Member(
                    "member_" + UUID.randomUUID(),
                    tenantId,
                    row.branchId().trim(),
                    row.membershipNo().trim().toUpperCase(Locale.ROOT),
                    row.fullName().trim(),
                    normalizedOrDefault(row.memberType(), "individual"),
                    row.phone().trim(),
                    blankToDefault(row.email()),
                    blankToDefault(row.nationalId()),
                    password.hash(),
                    password.salt(),
                    "pending_approval",
                    normalizedOrDefault(row.kycStatus(), "pending_verification"),
                    importJoiningDate(row.joiningDate()))));
        }

        auditService.record(
                tenantId,
                currentSession.user(),
                "Imported " + createdMembers.size() + " members",
                "member_import",
                tenantId,
                request.getRemoteAddr());

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(new MemberImportResult(
                tenantId,
                false,
                true,
                rows.size(),
                createdMembers.size(),
                0,
                List.of(),
                createdMembers.stream().map(MemberResponse::from).toList())));
    }

    @GetMapping("/metadata-import-template")
    ResponseEntity<?> memberMetadataImportTemplate(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null) return tenantAccessDenied();

        Member sampleMember = memberRepository.findByTenantIdOrderByMembershipNoAsc(tenantId).stream().findFirst().orElse(null);
        String membershipNo = sampleMember == null ? "" : sampleMember.getMembershipNo();
        List<MemberMetadataImportRow> sampleRows = List.of(
                new MemberMetadataImportRow("kyc_status", membershipNo, "", "", "", "", "", "", "", "", "", "verified"),
                new MemberMetadataImportRow("document", membershipNo, "", "", "", "", "", "", "national_id", "kyc/" + membershipNo + "/national-id.pdf", "verified", ""),
                new MemberMetadataImportRow("next_of_kin", membershipNo, "Sample Next Of Kin", "spouse", "+256700111222", "Kampala", "true", "", "", "", "", ""),
                new MemberMetadataImportRow("beneficiary", membershipNo, "Sample Beneficiary", "daughter", "+256700333444", "", "", "50", "", "", "", ""));

        return ResponseEntity.ok(ApiResponse.of(new MemberMetadataImportTemplateResponse(
                tenantId,
                "member-metadata-import-template-" + tenantId + ".csv",
                "text/csv",
                MEMBER_METADATA_IMPORT_HEADERS,
                sampleRows,
                metadataCsvTemplate(sampleRows))));
    }

    @PostMapping("/metadata-import")
    @Transactional
    ResponseEntity<?> importMemberMetadata(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody MemberMetadataImportRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String tenantId = tenantScope(currentSession, body.tenantId());
        if (tenantId == null) return tenantAccessDenied();

        List<MemberMetadataImportRow> rows = body.rows() == null ? List.of() : body.rows();
        boolean dryRun = body.dryRun() == null || body.dryRun();
        List<MemberMetadataImportError> errors = validateMetadataImportRows(tenantId, rows);
        if (!errors.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.of(new MemberMetadataImportResult(
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
            return ResponseEntity.ok(ApiResponse.of(new MemberMetadataImportResult(
                    tenantId,
                    true,
                    true,
                    rows.size(),
                    0,
                    0,
                    List.of(),
                    List.of())));
        }

        List<MemberMetadataCreatedRecord> createdRecords = new ArrayList<>();
        for (MemberMetadataImportRow row : rows) {
            Member member = memberRepository.findFirstByTenantIdAndMembershipNoIgnoreCase(tenantId, row.membershipNo().trim()).orElseThrow();
            String recordType = normalizedOrDefault(row.recordType(), "");
            if ("kyc_status".equals(recordType)) {
                member.updateKycStatus(normalizedOrDefault(row.kycStatus(), "pending_verification"));
                Member saved = memberRepository.save(member);
                createdRecords.add(new MemberMetadataCreatedRecord("kyc_status", saved.getId(), saved.getMembershipNo(), saved.getKycStatus()));
            } else if ("document".equals(recordType)) {
                MemberDocument document = memberDocumentRepository.save(new MemberDocument(
                        "member_document_" + UUID.randomUUID(),
                        tenantId,
                        member.getId(),
                        normalizedOrDefault(row.documentType(), "other"),
                        row.storageKey().trim(),
                        normalizedOrDefault(row.verificationStatus(), "pending_verification"),
                        currentSession.user().getId()));
                createdRecords.add(new MemberMetadataCreatedRecord("document", document.getId(), member.getMembershipNo(), document.getVerificationStatus()));
            } else if ("next_of_kin".equals(recordType)) {
                MemberNextOfKin nextOfKin = memberNextOfKinRepository.save(new MemberNextOfKin(
                        "kin_" + UUID.randomUUID(),
                        tenantId,
                        member.getId(),
                        row.fullName().trim(),
                        row.relationship().trim().toLowerCase(Locale.ROOT),
                        row.phone().trim(),
                        blankToDefault(row.address()),
                        parseBoolean(row.primaryContact()),
                        currentSession.user().getId()));
                createdRecords.add(new MemberMetadataCreatedRecord("next_of_kin", nextOfKin.getId(), member.getMembershipNo(), nextOfKin.getRelationship()));
            } else if ("beneficiary".equals(recordType)) {
                MemberBeneficiary beneficiary = memberBeneficiaryRepository.save(new MemberBeneficiary(
                        "beneficiary_" + UUID.randomUUID(),
                        tenantId,
                        member.getId(),
                        row.fullName().trim(),
                        row.relationship().trim().toLowerCase(Locale.ROOT),
                        blankToDefault(row.phone()),
                        amount(row.allocationPercent()),
                        currentSession.user().getId()));
                createdRecords.add(new MemberMetadataCreatedRecord("beneficiary", beneficiary.getId(), member.getMembershipNo(), beneficiary.getAllocationPercent().toPlainString()));
            }
        }

        auditService.record(
                tenantId,
                currentSession.user(),
                "Imported " + createdRecords.size() + " member metadata records",
                "member_metadata_import",
                tenantId,
                request.getRemoteAddr());

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(new MemberMetadataImportResult(
                tenantId,
                false,
                true,
                rows.size(),
                createdRecords.size(),
                0,
                List.of(),
                createdRecords)));
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

    private String metadataCsvTemplate(List<MemberMetadataImportRow> sampleRows) {
        String header = String.join(",", MEMBER_METADATA_IMPORT_HEADERS);
        List<String> rows = sampleRows.stream()
                .map(row -> String.join(",",
                        csv(row.recordType()),
                        csv(row.membershipNo()),
                        csv(row.fullName()),
                        csv(row.relationship()),
                        csv(row.phone()),
                        csv(row.address()),
                        csv(row.primaryContact()),
                        csv(row.allocationPercent()),
                        csv(row.documentType()),
                        csv(row.storageKey()),
                        csv(row.verificationStatus()),
                        csv(row.kycStatus())))
                .toList();
        return header + "\n" + String.join("\n", rows) + "\n";
    }

    private String csv(String value) {
        if (value == null) return "";
        if (!value.contains(",") && !value.contains("\"") && !value.contains("\n")) return value;
        return "\"" + value.replace("\"", "\"\"") + "\"";
    }

    private List<MemberImportError> validateImportRows(String tenantId, List<MemberImportRow> rows) {
        List<MemberImportError> errors = new ArrayList<>();
        if (rows.isEmpty()) {
            errors.add(new MemberImportError(0, "rows", "IMPORT_EMPTY", "At least one member row is required."));
            return errors;
        }
        if (rows.size() > 500) {
            errors.add(new MemberImportError(0, "rows", "IMPORT_TOO_LARGE", "A single member import cannot exceed 500 rows."));
            return errors;
        }

        Set<String> seenMembershipNos = new HashSet<>();
        for (int index = 0; index < rows.size(); index++) {
            int rowNumber = index + 1;
            MemberImportRow row = rows.get(index);
            if (row.membershipNo() == null || row.membershipNo().isBlank()) {
                errors.add(new MemberImportError(rowNumber, "membershipNo", "REQUIRED", "Membership number is required."));
            } else {
                String membershipNo = row.membershipNo().trim().toUpperCase(Locale.ROOT);
                if (!seenMembershipNos.add(membershipNo)) {
                    errors.add(new MemberImportError(rowNumber, "membershipNo", "DUPLICATE_IN_FILE", "Membership number is repeated in this import."));
                }
                if (memberRepository.existsByTenantIdAndMembershipNoIgnoreCase(tenantId, membershipNo)) {
                    errors.add(new MemberImportError(rowNumber, "membershipNo", "MEMBER_EXISTS", "A member with that membership number already exists."));
                }
            }
            if (row.branchId() == null || row.branchId().isBlank()) {
                errors.add(new MemberImportError(rowNumber, "branchId", "REQUIRED", "Branch ID is required."));
            } else if (!branchLookup.existsInTenant(row.branchId(), tenantId)) {
                errors.add(new MemberImportError(rowNumber, "branchId", "INVALID_BRANCH", "Branch does not exist for this tenant."));
            }
            if (row.fullName() == null || row.fullName().isBlank()) {
                errors.add(new MemberImportError(rowNumber, "fullName", "REQUIRED", "Full name is required."));
            }
            if (row.phone() == null || row.phone().isBlank()) {
                errors.add(new MemberImportError(rowNumber, "phone", "REQUIRED", "Phone is required."));
            }
            if (row.password() == null || row.password().isBlank()) {
                errors.add(new MemberImportError(rowNumber, "password", "REQUIRED", "Temporary member portal password is required."));
            } else if (row.password().trim().length() < 8) {
                errors.add(new MemberImportError(rowNumber, "password", "PASSWORD_TOO_SHORT", "Password must be at least 8 characters."));
            }
            if (row.joiningDate() != null && !row.joiningDate().isBlank()) {
                try {
                    LocalDate.parse(row.joiningDate().trim());
                } catch (DateTimeParseException error) {
                    errors.add(new MemberImportError(rowNumber, "joiningDate", "INVALID_DATE", "Joining date must use YYYY-MM-DD format."));
                }
            }

            String memberType = normalizedOrDefault(row.memberType(), "individual");
            if (!ALLOWED_MEMBER_TYPES.contains(memberType)) {
                errors.add(new MemberImportError(rowNumber, "memberType", "INVALID_MEMBER_TYPE", "Unsupported member type."));
            }
            String kycStatus = normalizedOrDefault(row.kycStatus(), "pending_verification");
            if (!ALLOWED_KYC_STATUSES.contains(kycStatus)) {
                errors.add(new MemberImportError(rowNumber, "kycStatus", "INVALID_KYC_STATUS", "Unsupported KYC status."));
            }
        }
        return errors;
    }

    private List<MemberMetadataImportError> validateMetadataImportRows(String tenantId, List<MemberMetadataImportRow> rows) {
        List<MemberMetadataImportError> errors = new ArrayList<>();
        if (rows.isEmpty()) {
            errors.add(new MemberMetadataImportError(0, "rows", "IMPORT_EMPTY", "At least one metadata row is required."));
            return errors;
        }
        if (rows.size() > 1000) {
            errors.add(new MemberMetadataImportError(0, "rows", "IMPORT_TOO_LARGE", "A single metadata import cannot exceed 1,000 rows."));
            return errors;
        }

        Set<String> seenMetadataKeys = new HashSet<>();
        Map<String, BigDecimal> importedBeneficiaryAllocation = new HashMap<>();
        for (int index = 0; index < rows.size(); index++) {
            int rowNumber = index + 1;
            MemberMetadataImportRow row = rows.get(index);
            String recordType = normalizedOrDefault(row.recordType(), "");
            if (!ALLOWED_METADATA_RECORD_TYPES.contains(recordType)) {
                errors.add(new MemberMetadataImportError(rowNumber, "recordType", "INVALID_RECORD_TYPE", "Record type must be next_of_kin, beneficiary, document, or kyc_status."));
                continue;
            }

            Member member = null;
            if (row.membershipNo() == null || row.membershipNo().isBlank()) {
                errors.add(new MemberMetadataImportError(rowNumber, "membershipNo", "REQUIRED", "Membership number is required."));
            } else {
                member = memberRepository.findFirstByTenantIdAndMembershipNoIgnoreCase(tenantId, row.membershipNo().trim()).orElse(null);
                if (member == null) {
                    errors.add(new MemberMetadataImportError(rowNumber, "membershipNo", "INVALID_MEMBER", "Member does not exist for this tenant."));
                }
            }

            if ("kyc_status".equals(recordType)) {
                String kycStatus = normalizedOrDefault(row.kycStatus(), "");
                if (!ALLOWED_KYC_STATUSES.contains(kycStatus)) {
                    errors.add(new MemberMetadataImportError(rowNumber, "kycStatus", "INVALID_KYC_STATUS", "Unsupported KYC status."));
                }
                duplicateMetadataKey(rowNumber, seenMetadataKeys, row.membershipNo(), recordType, "kyc", errors);
            } else if ("document".equals(recordType)) {
                String documentType = normalizedOrDefault(row.documentType(), "");
                if (!ALLOWED_DOCUMENT_TYPES.contains(documentType)) {
                    errors.add(new MemberMetadataImportError(rowNumber, "documentType", "INVALID_DOCUMENT_TYPE", "Unsupported member document type."));
                }
                String verificationStatus = normalizedOrDefault(row.verificationStatus(), "pending_verification");
                if (!ALLOWED_KYC_STATUSES.contains(verificationStatus)) {
                    errors.add(new MemberMetadataImportError(rowNumber, "verificationStatus", "INVALID_DOCUMENT_STATUS", "Unsupported member document status."));
                }
                if (row.storageKey() == null || row.storageKey().isBlank()) {
                    errors.add(new MemberMetadataImportError(rowNumber, "storageKey", "REQUIRED", "Document storage key is required."));
                }
                duplicateMetadataKey(rowNumber, seenMetadataKeys, row.membershipNo(), recordType, documentType + ":" + blankToDefault(row.storageKey()), errors);
            } else if ("next_of_kin".equals(recordType)) {
                validateRequiredMetadataField(rowNumber, "fullName", row.fullName(), errors);
                validateRequiredMetadataField(rowNumber, "relationship", row.relationship(), errors);
                validateRequiredMetadataField(rowNumber, "phone", row.phone(), errors);
                if (row.primaryContact() != null && !row.primaryContact().isBlank() && !isBoolean(row.primaryContact())) {
                    errors.add(new MemberMetadataImportError(rowNumber, "primaryContact", "INVALID_BOOLEAN", "Primary contact must be true or false."));
                }
                duplicateMetadataKey(rowNumber, seenMetadataKeys, row.membershipNo(), recordType, blankToDefault(row.fullName()) + ":" + blankToDefault(row.phone()), errors);
            } else if ("beneficiary".equals(recordType)) {
                validateRequiredMetadataField(rowNumber, "fullName", row.fullName(), errors);
                validateRequiredMetadataField(rowNumber, "relationship", row.relationship(), errors);
                BigDecimal allocation = validatedAmount(rowNumber, "allocationPercent", row.allocationPercent(), errors);
                if (allocation.compareTo(BigDecimal.ZERO) <= 0 || allocation.compareTo(new BigDecimal("100")) > 0) {
                    errors.add(new MemberMetadataImportError(rowNumber, "allocationPercent", "INVALID_ALLOCATION", "Beneficiary allocation must be greater than 0 and not exceed 100."));
                }
                duplicateMetadataKey(rowNumber, seenMetadataKeys, row.membershipNo(), recordType, blankToDefault(row.fullName()) + ":" + blankToDefault(row.relationship()), errors);
                if (member != null) {
                    importedBeneficiaryAllocation.merge(member.getId(), allocation, BigDecimal::add);
                    BigDecimal existingAllocation = memberBeneficiaryRepository.findByMemberIdOrderByCreatedAtDesc(member.getId()).stream()
                            .map(MemberBeneficiary::getAllocationPercent)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    if (existingAllocation.add(importedBeneficiaryAllocation.get(member.getId())).compareTo(new BigDecimal("100")) > 0) {
                        errors.add(new MemberMetadataImportError(rowNumber, "allocationPercent", "ALLOCATION_EXCEEDED", "Beneficiary allocations cannot exceed 100 percent."));
                    }
                }
            }
        }
        return errors;
    }

    private void validateRequiredMetadataField(int rowNumber, String field, String value, List<MemberMetadataImportError> errors) {
        if (value == null || value.isBlank()) {
            errors.add(new MemberMetadataImportError(rowNumber, field, "REQUIRED", field + " is required."));
        }
    }

    private void duplicateMetadataKey(
            int rowNumber,
            Set<String> seenMetadataKeys,
            String membershipNo,
            String recordType,
            String suffix,
            List<MemberMetadataImportError> errors) {
        String key = (blankToDefault(membershipNo) + ":" + recordType + ":" + blankToDefault(suffix)).toUpperCase(Locale.ROOT);
        if (!seenMetadataKeys.add(key)) {
            errors.add(new MemberMetadataImportError(rowNumber, "recordType", "DUPLICATE_IN_FILE", "Metadata record is repeated in this import."));
        }
    }

    private BigDecimal validatedAmount(int rowNumber, String field, String value, List<MemberMetadataImportError> errors) {
        if (value == null || value.isBlank()) {
            errors.add(new MemberMetadataImportError(rowNumber, field, "REQUIRED", field + " is required."));
            return BigDecimal.ZERO;
        }
        try {
            return amount(value);
        } catch (NumberFormatException error) {
            errors.add(new MemberMetadataImportError(rowNumber, field, "INVALID_AMOUNT", field + " must be numeric."));
            return BigDecimal.ZERO;
        }
    }

    private BigDecimal amount(String value) {
        return new BigDecimal(value.trim().replace(",", "")).stripTrailingZeros();
    }

    private boolean isBoolean(String value) {
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        return "true".equals(normalized) || "false".equals(normalized) || "yes".equals(normalized) || "no".equals(normalized);
    }

    private boolean parseBoolean(String value) {
        if (value == null || value.isBlank()) return false;
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        return "true".equals(normalized) || "yes".equals(normalized);
    }

    private LocalDate importJoiningDate(String joiningDate) {
        return joiningDate == null || joiningDate.isBlank() ? LocalDate.now() : LocalDate.parse(joiningDate.trim());
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

    record MemberImportRequest(
            String tenantId,
            Boolean dryRun,
            List<MemberImportRow> rows) {
    }

    record MemberImportRow(
            String membershipNo,
            String branchId,
            String fullName,
            String memberType,
            String phone,
            String email,
            String nationalId,
            String kycStatus,
            String joiningDate,
            String password) {
    }

    record MemberImportError(
            int row,
            String field,
            String code,
            String message) {
    }

    record MemberImportResult(
            String tenantId,
            boolean dryRun,
            boolean valid,
            int totalRows,
            int createdCount,
            int skippedCount,
            List<MemberImportError> errors,
            List<MemberResponse> createdMembers) {
    }

    record MemberMetadataImportTemplateResponse(
            String tenantId,
            String filename,
            String contentType,
            List<String> headers,
            List<MemberMetadataImportRow> sampleRows,
            String csv) {
    }

    record MemberMetadataImportRequest(
            String tenantId,
            Boolean dryRun,
            List<MemberMetadataImportRow> rows) {
    }

    record MemberMetadataImportRow(
            String recordType,
            String membershipNo,
            String fullName,
            String relationship,
            String phone,
            String address,
            String primaryContact,
            String allocationPercent,
            String documentType,
            String storageKey,
            String verificationStatus,
            String kycStatus) {
    }

    record MemberMetadataImportError(
            int row,
            String field,
            String code,
            String message) {
    }

    record MemberMetadataCreatedRecord(
            String recordType,
            String id,
            String membershipNo,
            String status) {
    }

    record MemberMetadataImportResult(
            String tenantId,
            boolean dryRun,
            boolean valid,
            int totalRows,
            int createdCount,
            int skippedCount,
            List<MemberMetadataImportError> errors,
            List<MemberMetadataCreatedRecord> createdRecords) {
    }
}
