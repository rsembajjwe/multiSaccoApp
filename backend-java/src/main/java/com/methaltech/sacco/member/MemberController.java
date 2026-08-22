package com.methaltech.sacco.member;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.api.PageParams;
import com.methaltech.sacco.api.PagedResponse;
import com.methaltech.sacco.finance.FinancialTransaction;
import com.methaltech.sacco.finance.FinancialTransactionRepository;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.money.Money;
import com.methaltech.sacco.security.PasswordHasher;
import com.methaltech.sacco.tenant.TenantService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.io.IOException;
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
import java.util.stream.Collectors;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;
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

    private static final long MAX_MEMBER_DOCUMENT_BYTES = 1_048_576L;
    private static final Set<String> ALLOWED_DOCUMENT_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf");

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
            "signed_registration_form",
            "bylaws",
            "registration_certificate",
            "other");
    private static final Set<String> ALLOWED_DOCUMENT_RETENTION_STATUSES = Set.of(
            "active",
            "review_due",
            "retained",
            "disposal_pending",
            "disposed");

    private final MemberRepository memberRepository;
    private final MemberDocumentRepository memberDocumentRepository;
    private final MemberNextOfKinRepository memberNextOfKinRepository;
    private final MemberBeneficiaryRepository memberBeneficiaryRepository;
    private final MemberPrivacyRequestRepository privacyRequestRepository;
    private final MemberFundBalanceRepository memberFundBalanceRepository;
    private final FinancialTransactionRepository financialTransactionRepository;
    private final BranchLookup branchLookup;
    private final TenantService tenantService;
    private final AuthService authService;
    private final AuditService auditService;
    private final PasswordHasher passwordHasher;
    private final DocumentStorageService documentStorageService;
    private final MemberSubscriptionService memberSubscriptionService;

    MemberController(
            MemberRepository memberRepository,
            MemberDocumentRepository memberDocumentRepository,
            MemberNextOfKinRepository memberNextOfKinRepository,
            MemberBeneficiaryRepository memberBeneficiaryRepository,
            MemberPrivacyRequestRepository privacyRequestRepository,
            MemberFundBalanceRepository memberFundBalanceRepository,
            FinancialTransactionRepository financialTransactionRepository,
            BranchLookup branchLookup,
            TenantService tenantService,
            AuthService authService,
            AuditService auditService,
            PasswordHasher passwordHasher,
            DocumentStorageService documentStorageService,
            MemberSubscriptionService memberSubscriptionService) {
        this.memberRepository = memberRepository;
        this.memberDocumentRepository = memberDocumentRepository;
        this.memberNextOfKinRepository = memberNextOfKinRepository;
        this.memberBeneficiaryRepository = memberBeneficiaryRepository;
        this.privacyRequestRepository = privacyRequestRepository;
        this.memberFundBalanceRepository = memberFundBalanceRepository;
        this.financialTransactionRepository = financialTransactionRepository;
        this.branchLookup = branchLookup;
        this.tenantService = tenantService;
        this.authService = authService;
        this.auditService = auditService;
        this.passwordHasher = passwordHasher;
        this.documentStorageService = documentStorageService;
        this.memberSubscriptionService = memberSubscriptionService;
    }

    @GetMapping
    ResponseEntity<?> listMembers(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId,
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "sort", required = false) String sortBy,
            @RequestParam(name = "direction", required = false) String direction,
            @RequestParam(name = "page", required = false) Integer page,
            @RequestParam(name = "size", required = false) Integer size) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null) return tenantAccessDenied();

        boolean platformAll = authService.isPlatform(currentSession.user()) && requestedTenantId == null;
        String searchTerm = searchTerm(search);
        List<String> branchScope = branchScope(currentSession, tenantId);

        if (PageParams.requested(page, size)) {
            Sort sort = sortBy(platformAll, sortBy, direction, Map.of(
                    "membershipNo", "membershipNo",
                    "fullName", "fullName",
                    "phone", "phone",
                    "email", "email",
                    "kycStatus", "kycStatus",
                    "status", "status",
                    "joiningDate", "joiningDate",
                    "tenantId", "tenantId"), "membershipNo");
            Pageable pageable = PageParams.toPageable(page, size, sort);
            Page<Member> result = platformAll
                    ? (searchTerm == null ? memberRepository.findAll(pageable) : memberRepository.searchAll(searchTerm, pageable))
                    : (!branchScope.isEmpty()
                            ? (searchTerm == null
                                    ? memberRepository.findByTenantIdAndBranchIdIn(tenantId, branchScope, pageable)
                                    : memberRepository.searchByTenantIdAndBranchIds(tenantId, branchScope, searchTerm, pageable))
                            : (searchTerm == null
                                    ? memberRepository.findByTenantId(tenantId, pageable)
                                    : memberRepository.searchByTenantId(tenantId, searchTerm, pageable)));
            return ResponseEntity.ok(PagedResponse.of(
                    result.getContent().stream().map(MemberResponse::fromSummary).toList(),
                    result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages()));
        }

        List<Member> members = platformAll
                ? memberRepository.findAllByOrderByTenantIdAscMembershipNoAsc()
                : (!branchScope.isEmpty()
                        ? memberRepository.findByTenantIdAndBranchIdInOrderByMembershipNoAsc(tenantId, branchScope)
                        : memberRepository.findByTenantIdOrderByMembershipNoAsc(tenantId));
        if (searchTerm != null) {
            String needle = searchTerm.toLowerCase(Locale.ROOT);
            members = members.stream()
                    .filter(member -> searchable(member.getMembershipNo(), member.getFullName(), member.getPhone(), member.getEmail(), member.getKycStatus(), member.getStatus()).contains(needle))
                    .toList();
        }

        return ResponseEntity.ok(ApiResponse.of(members.stream().map(MemberResponse::fromSummary).toList()));
    }

    @GetMapping("/fund-balances")
    ResponseEntity<?> listMemberFundBalances(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null) return tenantAccessDenied();

        List<String> branchScope = branchScope(currentSession, tenantId);
        Set<String> visibleMemberIds = branchScope.isEmpty()
                ? memberRepository.findByTenantIdOrderByMembershipNoAsc(tenantId).stream().map(Member::getId).collect(Collectors.toSet())
                : memberRepository.findByTenantIdAndBranchIdInOrderByMembershipNoAsc(tenantId, branchScope).stream().map(Member::getId).collect(Collectors.toSet());
        List<MemberFundBalanceExportResponse> balances = memberFundBalanceRepository.findByTenantIdOrderByMemberIdAscFundCodeAsc(tenantId).stream()
                .filter(balance -> visibleMemberIds.contains(balance.getMemberId()))
                .map(MemberFundBalanceExportResponse::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.of(balances));
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
        if (!authService.isPlatform(currentSession.user()) && !authService.hasPermission(currentSession.user(), "members:create")) {
            return authService.permissionRequired("members:create");
        }

        String tenantId = tenantScope(currentSession, body.tenantId());
        if (tenantId == null) return tenantAccessDenied();

        List<MemberImportRow> rows = body.rows() == null ? List.of() : body.rows();
        boolean dryRun = body.dryRun() == null || body.dryRun();
        List<MemberImportError> errors = validateImportRows(tenantId, rows);
        List<String> branchScope = branchScope(currentSession, tenantId);
        if (!branchScope.isEmpty()) {
            for (int i = 0; i < rows.size(); i++) {
                String rowBranchId = rows.get(i).branchId() == null ? "" : rows.get(i).branchId().trim();
                if (!rowBranchId.isBlank() && !branchScope.contains(rowBranchId)) {
                    errors.add(new MemberImportError(i + 1, "branchId", "BRANCH_ACCESS_DENIED", "Branch is outside the user's assigned scope."));
                }
            }
        }
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
                    normalizedOrDefault(row.kycStatus(), "verified"),
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
        if (!authService.isPlatform(currentSession.user()) && !authService.hasPermission(currentSession.user(), "members:create")) {
            return authService.permissionRequired("members:create");
        }

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
                member.updateKycStatus(normalizedOrDefault(row.kycStatus(), "verified"));
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
        if (!authService.isPlatform(currentSession.user()) && !authService.hasPermission(currentSession.user(), "members:create")) {
            return authService.permissionRequired("members:create");
        }

        String tenantId = tenantScope(currentSession, body.tenantId());
        if (tenantId == null) return tenantAccessDenied();

        if (!branchLookup.existsInTenant(body.branchId(), tenantId)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_BRANCH", "Branch does not exist for this tenant."));
        }
        if (!canAccessBranch(currentSession, tenantId, body.branchId().trim())) {
            return branchAccessDenied();
        }

        String memberType = normalizedOrDefault(body.memberType(), "individual");
        if (!ALLOWED_MEMBER_TYPES.contains(memberType)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_MEMBER_TYPE", "Unsupported member type."));
        }

        // Members are entered directly by SACCO staff (chairperson), so they are trusted on entry:
        // there is no separate KYC verification step. The record is always kept verified.
        String kycStatus = "verified";

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
        memberSubscriptionService.ensureMandatorySubscription(member);

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
                    if (!canAccessMember(currentSession, member)) return memberAccessDenied(currentSession, member);
                    return ResponseEntity.ok(ApiResponse.of(MemberResponse.from(member)));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "MEMBER_NOT_FOUND", "Member not found.")));
    }

    @PatchMapping("/{memberId}")
    ResponseEntity<?> updateMember(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String memberId,
            @Valid @RequestBody UpdateMemberRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.isPlatform(currentSession.user())
                && !authService.hasPermission(currentSession.user(), "members:create")
                && !authService.hasPermission(currentSession.user(), "members:approve")) {
            return authService.permissionRequired("members:create");
        }

        return memberRepository.findById(memberId)
                .<ResponseEntity<?>>map(member -> {
                    if (!canAccessMember(currentSession, member)) return memberAccessDenied(currentSession, member);

                    String branchId = body.branchId().trim();
                    if (!branchLookup.existsInTenant(branchId, member.getTenantId())) {
                        return ResponseEntity.badRequest()
                                .body(ApiErrorResponse.of(400, "INVALID_BRANCH", "Branch does not exist for this SACCO."));
                    }
                    if (!canAccessBranch(currentSession, member.getTenantId(), branchId)) {
                        return branchAccessDenied();
                    }

                    String memberType = normalizedOrDefault(body.memberType(), "individual");
                    if (!ALLOWED_MEMBER_TYPES.contains(memberType)) {
                        return ResponseEntity.badRequest()
                                .body(ApiErrorResponse.of(400, "INVALID_MEMBER_TYPE", "Unsupported member type."));
                    }

                    String status = normalizedOrDefault(body.status(), member.getStatus());
                    if (!ALLOWED_MEMBER_STATUSES.contains(status)) {
                        return ResponseEntity.badRequest()
                                .body(ApiErrorResponse.of(400, "INVALID_MEMBER_STATUS", "Unsupported member status."));
                    }

                    String kycStatus = normalizedOrDefault(body.kycStatus(), member.getKycStatus());
                    if (!ALLOWED_KYC_STATUSES.contains(kycStatus)) {
                        return ResponseEntity.badRequest()
                                .body(ApiErrorResponse.of(400, "INVALID_KYC_STATUS", "Unsupported KYC status."));
                    }

                    String phone = body.phone().trim();
                    if (memberRepository.findByTenantIdOrderByMembershipNoAsc(member.getTenantId()).stream()
                            .anyMatch(existing -> !existing.getId().equals(member.getId())
                                    && existing.getPhone() != null
                                    && existing.getPhone().equalsIgnoreCase(phone))) {
                        return ResponseEntity.status(HttpStatus.CONFLICT)
                                .body(ApiErrorResponse.of(409, "MEMBER_PHONE_EXISTS", "Another member already uses that phone number."));
                    }

                    String email = blankToDefault(body.email());
                    if (!email.isBlank() && memberRepository.findByTenantIdOrderByMembershipNoAsc(member.getTenantId()).stream()
                            .anyMatch(existing -> !existing.getId().equals(member.getId())
                                    && existing.getEmail() != null
                                    && existing.getEmail().equalsIgnoreCase(email))) {
                        return ResponseEntity.status(HttpStatus.CONFLICT)
                                .body(ApiErrorResponse.of(409, "MEMBER_EMAIL_EXISTS", "Another member already uses that email address."));
                    }

                    LocalDate joiningDate = body.joiningDate() == null ? member.getJoiningDate() : body.joiningDate();
                    member.updateProfile(
                            branchId,
                            body.fullName().trim(),
                            memberType,
                            phone,
                            email,
                            blankToDefault(body.nationalId()),
                            status,
                            kycStatus,
                            joiningDate);
                    Member saved = memberRepository.save(member);
                    auditService.record(
                            saved.getTenantId(),
                            currentSession.user(),
                            "Updated member " + saved.getMembershipNo() + " profile",
                            "member",
                            saved.getId(),
                            request.getRemoteAddr());
                    return ResponseEntity.ok(ApiResponse.of(MemberResponse.from(saved)));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "MEMBER_NOT_FOUND", "Member not found.")));
    }

    @PatchMapping("/{memberId}/staff-link")
    ResponseEntity<?> linkMemberToStaffUser(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String memberId,
            @RequestBody StaffLinkRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.isPlatform(currentSession.user()) && !authService.hasPermission(currentSession.user(), "members:approve")) {
            return authService.permissionRequired("members:approve");
        }

        Member member = memberRepository.findById(memberId).orElse(null);
        if (member == null || !canAccessMember(currentSession, member)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "MEMBER_NOT_FOUND", "Member not found."));
        }

        String userId = body == null || body.userId() == null ? "" : body.userId().trim();
        if (userId.isBlank()) {
            member.unlinkStaffUser();
            Member saved = memberRepository.save(member);
            auditService.record(saved.getTenantId(), currentSession.user(),
                    "Unlinked staff user from member " + saved.getMembershipNo(),
                    "member", saved.getId(), request.getRemoteAddr());
            return ResponseEntity.ok(ApiResponse.of(MemberResponse.from(saved)));
        }

        var staffUser = authService.findUser(userId).orElse(null);
        if (staffUser == null || !staffUser.getTenantId().equals(member.getTenantId())) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_STAFF_USER", "Staff user does not exist in this SACCO."));
        }
        boolean linkedElsewhere = memberRepository.findFirstByLinkedUserId(userId)
                .map(existing -> !existing.getId().equals(member.getId()))
                .orElse(false);
        if (linkedElsewhere) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "STAFF_ALREADY_LINKED", "That staff user is already linked to another member."));
        }

        member.linkStaffUser(userId);
        Member saved = memberRepository.save(member);
        auditService.record(saved.getTenantId(), currentSession.user(),
                "Linked staff user " + userId + " to member " + saved.getMembershipNo(),
                "member", saved.getId(), request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(MemberResponse.from(saved)));
    }

    record StaffLinkRequest(String userId) {
    }

    /** Minimal staff directory for the member↔staff link picker, available to anyone who can
     *  manage members (so the picker works even without the broader users:view permission). */
    @GetMapping("/staff-directory")
    ResponseEntity<?> staffDirectory(
            @RequestHeader(name = "Authorization", required = false) String authorization) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.isPlatform(currentSession.user()) && !authService.hasPermission(currentSession.user(), "members:approve")) {
            return authService.permissionRequired("members:approve");
        }
        List<StaffDirectoryEntry> staff = authService.tenantStaff(currentSession.user().getTenantId()).stream()
                .filter(user -> "active".equals(user.getStatus()))
                .map(user -> new StaffDirectoryEntry(user.getId(), user.getTenantId(), user.getFullName(), user.getEmail()))
                .toList();
        return ResponseEntity.ok(ApiResponse.of(staff));
    }

    record StaffDirectoryEntry(String id, String tenantId, String fullName, String email) {
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
                    if (!canAccessMember(currentSession, member)) return memberAccessDenied(currentSession, member);
                    return ResponseEntity.ok(ApiResponse.of(statementFor(member, from, to)));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "MEMBER_NOT_FOUND", "Member not found.")));
    }

    @GetMapping(value = "/{memberId}/statement/export.csv", produces = "text/csv")
    ResponseEntity<?> exportMemberStatementCsv(
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
                    if (!canAccessMember(currentSession, member)) return memberAccessDenied(currentSession, member);
                    MemberStatementResponse statement = statementFor(member, from, to);
                    return ResponseEntity.ok()
                            .contentType(MediaType.parseMediaType("text/csv"))
                            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + statementFilename(member) + "\"")
                            .body(statement.csv());
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
                    if (!canAccessMember(currentSession, member)) return memberAccessDenied(currentSession, member);
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
                    if (!canAccessMember(currentSession, member)) return memberAccessDenied(currentSession, member);
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
                    if (!canAccessMember(currentSession, member)) return memberAccessDenied(currentSession, member);
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
                    if (!canAccessMember(currentSession, member)) return memberAccessDenied(currentSession, member);
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
                    if (!canAccessMember(currentSession, member)) return memberAccessDenied(currentSession, member);
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
                    if (!canAccessMember(currentSession, member)) return memberAccessDenied(currentSession, member);
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

    @PostMapping(path = "/{memberId}/documents/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    ResponseEntity<?> uploadMemberDocument(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String memberId,
            @RequestParam String documentType,
            @RequestParam(defaultValue = "pending_verification") String verificationStatus,
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        String normalizedDocumentType = normalizedOrDefault(documentType, "");
        if (!ALLOWED_DOCUMENT_TYPES.contains(normalizedDocumentType)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_DOCUMENT_TYPE", "Unsupported member document type."));
        }
        String normalizedStatus = normalizedOrDefault(verificationStatus, "pending_verification");
        if (!ALLOWED_KYC_STATUSES.contains(normalizedStatus)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_DOCUMENT_STATUS", "Unsupported member document status."));
        }
        ResponseEntity<?> validation = validateUploadedMemberDocument(file);
        if (validation != null) return validation;

        return memberRepository.findById(memberId)
                .<ResponseEntity<?>>map(member -> {
                    if (!canAccessMember(currentSession, member)) return memberAccessDenied(currentSession, member);
                    try {
                        String storageKey = documentStorageService.store(
                                member.getTenantId(),
                                member.getId(),
                                normalizedDocumentType,
                                file.getOriginalFilename(),
                                file.getContentType(),
                                file.getBytes());
                        MemberDocument document = memberDocumentRepository.save(new MemberDocument(
                                "member_document_" + UUID.randomUUID(),
                                member.getTenantId(),
                                member.getId(),
                                normalizedDocumentType,
                                storageKey,
                                normalizedStatus,
                                currentSession.user().getId()));
                        auditService.record(
                                member.getTenantId(),
                                currentSession.user(),
                                "Uploaded soft-copy " + document.getDocumentType() + " for member " + member.getMembershipNo(),
                                "member_document",
                                document.getId(),
                                request.getRemoteAddr());
                        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(MemberDocumentResponse.from(document)));
                    } catch (IOException | DocumentStorageException ex) {
                        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                .body(ApiErrorResponse.of(400, "DOCUMENT_UPLOAD_FAILED", ex.getMessage()));
                    }
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "MEMBER_NOT_FOUND", "Member not found.")));
    }

    @GetMapping("/{memberId}/documents/{documentId}/content")
    ResponseEntity<?> downloadMemberDocument(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String memberId,
            @PathVariable String documentId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        return memberRepository.findById(memberId)
                .<ResponseEntity<?>>map(member -> {
                    if (!canAccessMember(currentSession, member)) return memberAccessDenied(currentSession, member);
                    return memberDocumentRepository.findByIdAndTenantIdAndMemberId(documentId, member.getTenantId(), member.getId())
                            .<ResponseEntity<?>>map(document -> {
                                try {
                                    DocumentStorageObject stored = documentStorageService.read(document.getStorageKey());
                                    return ResponseEntity.ok()
                                            .contentType(MediaType.parseMediaType(stored.contentType()))
                                            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + stored.filename().replace("\"", "") + "\"")
                                            .body(stored.content());
                                } catch (DocumentStorageException ex) {
                                    return ResponseEntity.status(HttpStatus.NOT_FOUND)
                                            .body(ApiErrorResponse.of(404, "DOCUMENT_FILE_NOT_FOUND", ex.getMessage()));
                                }
                            })
                            .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                                    .body(ApiErrorResponse.of(404, "DOCUMENT_NOT_FOUND", "Member document not found.")));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "MEMBER_NOT_FOUND", "Member not found.")));
    }

    private ResponseEntity<?> validateUploadedMemberDocument(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "DOCUMENT_FILE_REQUIRED", "Select a soft-copy file to upload."));
        }
        if (file.getSize() > MAX_MEMBER_DOCUMENT_BYTES) {
            return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                    .body(ApiErrorResponse.of(413, "DOCUMENT_FILE_TOO_LARGE", "Member documents must be 1 MB or smaller."));
        }
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        if (!ALLOWED_DOCUMENT_CONTENT_TYPES.contains(contentType)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "DOCUMENT_FILE_TYPE_NOT_ALLOWED", "Upload JPG, PNG, WEBP or PDF files only."));
        }
        return null;
    }

    @PatchMapping("/{memberId}/documents/{documentId}/retention")
    ResponseEntity<?> updateMemberDocumentRetention(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String memberId,
            @PathVariable String documentId,
            @Valid @RequestBody UpdateMemberDocumentRetentionRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.isPlatform(currentSession.user()) && !authService.hasPermission(currentSession.user(), "members:approve")) {
            return authService.permissionRequired("members:approve");
        }

        String retentionStatus = normalizedOrDefault(body.retentionStatus(), "");
        if (!ALLOWED_DOCUMENT_RETENTION_STATUSES.contains(retentionStatus)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_DOCUMENT_RETENTION_STATUS", "Unsupported document retention status."));
        }

        return memberRepository.findById(memberId)
                .<ResponseEntity<?>>map(member -> {
                    if (!canAccessMember(currentSession, member)) return memberAccessDenied(currentSession, member);
                    return memberDocumentRepository.findByIdAndTenantIdAndMemberId(documentId, member.getTenantId(), member.getId())
                            .<ResponseEntity<?>>map(document -> {
                                DocumentStorageActionResult storageAction = null;
                                if ("disposed".equals(retentionStatus)) {
                                    try {
                                        storageAction = documentStorageService.dispose(document.getStorageKey());
                                    } catch (DocumentStorageException ex) {
                                        return ResponseEntity.status(HttpStatus.CONFLICT)
                                                .body(ApiErrorResponse.of(409, "DOCUMENT_STORAGE_DISPOSAL_FAILED", ex.getMessage()));
                                    }
                                }
                                document.updateRetention(
                                        retentionStatus,
                                        truncate(body.retentionReason(), 500),
                                        body.retentionReviewDueAt(),
                                        currentSession.user().getId());
                                if (storageAction != null) {
                                    document.recordStorageAction(storageAction);
                                }
                                MemberDocument saved = memberDocumentRepository.save(document);
                                auditService.record(
                                        member.getTenantId(),
                                        currentSession.user(),
                                        "Updated KYC document retention to " + retentionStatus + " for " + member.getMembershipNo(),
                                        "member_document_retention",
                                        saved.getId(),
                                        request.getRemoteAddr());
                                return ResponseEntity.ok(ApiResponse.of(MemberDocumentResponse.from(saved)));
                            })
                            .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                                    .body(ApiErrorResponse.of(404, "MEMBER_DOCUMENT_NOT_FOUND", "Member document not found.")));
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
        if (!authService.isPlatform(currentSession.user()) && !authService.hasPermission(currentSession.user(), "members:approve")) {
            return authService.permissionRequired("members:approve");
        }

        String status = body.status().trim();
        if (!ALLOWED_MEMBER_STATUSES.contains(status)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_MEMBER_STATUS", "Unsupported member status."));
        }

        return memberRepository.findById(memberId)
                .<ResponseEntity<?>>map(member -> {
                    if (!canAccessMember(currentSession, member)) return memberAccessDenied(currentSession, member);
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

    @GetMapping("/{memberId}/privacy-requests")
    ResponseEntity<?> listMemberPrivacyRequests(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String memberId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        return memberRepository.findById(memberId)
                .<ResponseEntity<?>>map(member -> {
                    if (!canAccessMember(currentSession, member)) return memberAccessDenied(currentSession, member);
                    return ResponseEntity.ok(ApiResponse.of(privacyRequestRepository
                            .findByTenantIdAndMemberIdOrderByCreatedAtDesc(member.getTenantId(), member.getId())
                            .stream()
                            .map(MemberPrivacyRequestResponse::from)
                            .toList()));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "MEMBER_NOT_FOUND", "Member not found.")));
    }

    @PostMapping("/{memberId}/privacy-requests")
    ResponseEntity<?> createMemberPrivacyRequest(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String memberId,
            @Valid @RequestBody CreatePrivacyRequestRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String requestType = normalizedPrivacyType(body.requestType());
        if (!MemberPrivacyRequest.ALLOWED_TYPES.contains(requestType)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_PRIVACY_REQUEST_TYPE", "Unsupported privacy request type."));
        }

        return memberRepository.findById(memberId)
                .<ResponseEntity<?>>map(member -> {
                    if (!canAccessMember(currentSession, member)) return memberAccessDenied(currentSession, member);
                    MemberPrivacyRequest privacyRequest = privacyRequestRepository.save(new MemberPrivacyRequest(
                            "member_privacy_request_" + UUID.randomUUID(),
                            member.getTenantId(),
                            member.getId(),
                            requestType,
                            truncate(body.reason(), 500),
                            null,
                            currentSession.user().getId()));
                    auditService.record(
                            member.getTenantId(),
                            currentSession.user(),
                            "Created member privacy request " + requestType + " for " + member.getMembershipNo(),
                            "member_privacy_request",
                            privacyRequest.getId(),
                            request.getRemoteAddr());
                    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(MemberPrivacyRequestResponse.from(privacyRequest)));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "MEMBER_NOT_FOUND", "Member not found.")));
    }

    @PatchMapping("/{memberId}/privacy-requests/{privacyRequestId}/status")
    @Transactional
    ResponseEntity<?> updateMemberPrivacyRequestStatus(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String memberId,
            @PathVariable String privacyRequestId,
            @Valid @RequestBody UpdatePrivacyRequestStatusRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.isPlatform(currentSession.user()) && !authService.hasPermission(currentSession.user(), "members:approve")) {
            return authService.permissionRequired("members:approve");
        }

        String status = normalizedOrDefault(body.status(), "");
        if (!MemberPrivacyRequest.ALLOWED_STATUSES.contains(status)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_PRIVACY_REQUEST_STATUS", "Unsupported privacy request status."));
        }

        return memberRepository.findById(memberId)
                .<ResponseEntity<?>>map(member -> {
                    if (!canAccessMember(currentSession, member)) return memberAccessDenied(currentSession, member);
                    return privacyRequestRepository.findByIdAndTenantIdAndMemberId(privacyRequestId, member.getTenantId(), member.getId())
                            .<ResponseEntity<?>>map(privacyRequest -> {
                                privacyRequest.transition(status, truncate(body.resolutionNote(), 500), currentSession.user().getId());
                                MemberPrivacyRequest savedRequest = privacyRequestRepository.save(privacyRequest);
                                if ("completed".equals(status) && "erasure".equals(savedRequest.getRequestType())) {
                                    member.redactPersonalDataForErasure();
                                    memberRepository.save(member);
                                }
                                auditService.record(
                                        member.getTenantId(),
                                        currentSession.user(),
                                        "Updated member privacy request " + savedRequest.getRequestType() + " to " + status,
                                        "member_privacy_request",
                                        savedRequest.getId(),
                                        request.getRemoteAddr());
                                return ResponseEntity.ok(ApiResponse.of(MemberPrivacyRequestResponse.from(savedRequest)));
                            })
                            .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                                    .body(ApiErrorResponse.of(404, "PRIVACY_REQUEST_NOT_FOUND", "Privacy request not found.")));
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

    private List<String> branchScope(AuthService.CurrentSession currentSession, String tenantId) {
        if (authService.isPlatform(currentSession.user()) || authService.hasPermission(currentSession.user(), "tenants:manage")) {
            return List.of();
        }
        return branchLookup.managedBranchIds(tenantId, currentSession.user().getId());
    }

    private boolean canAccessMember(AuthService.CurrentSession currentSession, Member member) {
        return canAccess(currentSession, member.getTenantId())
                && canAccessBranch(currentSession, member.getTenantId(), member.getBranchId());
    }

    private boolean canAccessBranch(AuthService.CurrentSession currentSession, String tenantId, String branchId) {
        List<String> scopedBranchIds = branchScope(currentSession, tenantId);
        return scopedBranchIds.isEmpty() || scopedBranchIds.contains(branchId);
    }

    private ResponseEntity<ApiErrorResponse> tenantAccessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access members for another tenant."));
    }

    private ResponseEntity<ApiErrorResponse> memberAccessDenied(AuthService.CurrentSession currentSession, Member member) {
        return canAccess(currentSession, member.getTenantId()) ? branchAccessDenied() : tenantAccessDenied();
    }

    private ResponseEntity<ApiErrorResponse> branchAccessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "BRANCH_ACCESS_DENIED", "Cannot access members outside assigned branch scope."));
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

    private Sort sortBy(boolean platformAll, String requestedSort, String requestedDirection, Map<String, String> allowed, String fallback) {
        String property = allowed.getOrDefault(requestedSort == null ? "" : requestedSort.trim(), fallback);
        Sort.Direction resolvedDirection = "desc".equalsIgnoreCase(requestedDirection) ? Sort.Direction.DESC : Sort.Direction.ASC;
        Sort sort = Sort.by(resolvedDirection, property);
        return platformAll && !"tenantId".equals(property) ? Sort.by(Sort.Direction.ASC, "tenantId").and(sort) : sort;
    }

    private String normalizedOrDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim().toLowerCase();
    }

    private String normalizedPrivacyType(String value) {
        return value == null ? "" : value.trim().toLowerCase().replace("-", "_");
    }

    private String blankToDefault(String value) {
        return value == null || value.isBlank() ? "" : value.trim();
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.isBlank()) return "";
        String trimmed = value.trim();
        return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
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
            String kycStatus = normalizedOrDefault(row.kycStatus(), "verified");
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
        return Money.parse(value);
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

    private String statementFilename(Member member) {
        String membershipNo = member.getMembershipNo() == null || member.getMembershipNo().isBlank()
                ? member.getId()
                : member.getMembershipNo();
        return "member-statement-" + membershipNo.replaceAll("[^A-Za-z0-9._-]", "-") + ".csv";
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

    record UpdateMemberRequest(
            @NotBlank String branchId,
            @NotBlank String fullName,
            String memberType,
            @NotBlank String phone,
            String email,
            String nationalId,
            String status,
            String kycStatus,
            LocalDate joiningDate) {
    }

    record UpdateMemberStatusRequest(@NotBlank String status) {
    }

    record CreatePrivacyRequestRequest(@NotBlank String requestType, String reason) {
    }

    record UpdatePrivacyRequestStatusRequest(@NotBlank String status, String resolutionNote) {
    }

    record CreateMemberDocumentRequest(
            @NotBlank String documentType,
            @NotBlank String storageKey,
            String verificationStatus) {
    }

    record UpdateMemberDocumentRetentionRequest(
            @NotBlank String retentionStatus,
            String retentionReason,
            LocalDate retentionReviewDueAt) {
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

    record MemberFundBalanceExportResponse(
            String memberId,
            String fundCode,
            BigDecimal balance,
            Instant updatedAt) {
        static MemberFundBalanceExportResponse from(MemberFundBalance balance) {
            return new MemberFundBalanceExportResponse(
                    balance.getMemberId(),
                    balance.getFundCode(),
                    balance.getBalance(),
                    balance.getUpdatedAt());
        }
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
