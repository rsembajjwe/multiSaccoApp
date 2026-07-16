package com.methaltech.sacco.member;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.security.PasswordHasher;
import com.methaltech.sacco.tenant.TenantService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
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

    private final MemberRepository memberRepository;
    private final BranchLookup branchLookup;
    private final TenantService tenantService;
    private final AuthService authService;
    private final AuditService auditService;
    private final PasswordHasher passwordHasher;

    MemberController(
            MemberRepository memberRepository,
            BranchLookup branchLookup,
            TenantService tenantService,
            AuthService authService,
            AuditService auditService,
            PasswordHasher passwordHasher) {
        this.memberRepository = memberRepository;
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
}
