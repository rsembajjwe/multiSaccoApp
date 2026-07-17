package com.methaltech.sacco.finance;

import com.methaltech.sacco.accounting.AccountingPeriodService;
import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
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
@RequestMapping("/api/v1/welfare-claims")
class WelfareClaimController {

    private static final Set<String> DECISION_STATUSES = Set.of("approved", "rejected");
    private static final Set<String> PAYMENT_CHANNELS = Set.of("mobile_money", "cash", "bank");

    private final WelfareClaimRepository claimRepository;
    private final MemberRepository memberRepository;
    private final AuthService authService;
    private final AuditService auditService;
    private final AccountingPeriodService periodService;

    WelfareClaimController(
            WelfareClaimRepository claimRepository,
            MemberRepository memberRepository,
            AuthService authService,
            AuditService auditService,
            AccountingPeriodService periodService) {
        this.claimRepository = claimRepository;
        this.memberRepository = memberRepository;
        this.authService = authService;
        this.auditService = auditService;
        this.periodService = periodService;
    }

    @GetMapping
    ResponseEntity<?> listClaims(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId,
            @RequestParam(name = "memberId", required = false) String memberId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null && !authService.isPlatform(currentSession.user())) return tenantAccessDenied();

        List<WelfareClaim> claims;
        if (authService.isPlatform(currentSession.user()) && requestedTenantId == null) {
            claims = claimRepository.findAllByOrderByTenantIdAscSubmittedAtDesc();
        } else if (memberId != null && !memberId.isBlank()) {
            Member member = scopedMember(tenantId, memberId.trim());
            if (member == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "MEMBER_NOT_FOUND", "Member not found for this tenant."));
            }
            claims = claimRepository.findByTenantIdAndMemberIdOrderBySubmittedAtDesc(tenantId, member.getId());
        } else {
            claims = claimRepository.findByTenantIdOrderBySubmittedAtDesc(tenantId);
        }

        return ResponseEntity.ok(ApiResponse.of(toResponses(claims)));
    }

    @PostMapping
    ResponseEntity<?> submitClaim(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody SubmitWelfareClaimRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String tenantId = tenantScope(currentSession, body.tenantId());
        if (tenantId == null) return tenantAccessDenied();

        Member member = scopedMember(tenantId, body.memberId().trim());
        if (member == null) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_MEMBER", "Member does not exist for this tenant."));
        }
        if (!"active".equals(member.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "MEMBER_NOT_ACTIVE", "Only active members can submit welfare claims."));
        }
        if (body.amount().compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_WELFARE_CLAIM_AMOUNT", "Welfare claim amount must be greater than zero."));
        }

        String reference = body.reference() == null || body.reference().isBlank()
                ? referenceForTenant(tenantId)
                : body.reference().trim();
        if (claimRepository.existsByTenantIdAndReferenceIgnoreCase(tenantId, reference)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "WELFARE_CLAIM_REFERENCE_EXISTS", "A welfare claim with that reference already exists for this tenant."));
        }

        WelfareClaim claim = claimRepository.save(new WelfareClaim(
                "welfare_claim_" + UUID.randomUUID(),
                tenantId,
                member.getId(),
                body.claimType().trim(),
                body.amount(),
                reference,
                body.description() == null ? "" : body.description().trim(),
                currentSession.user().getId()));
        auditService.record(
                tenantId,
                currentSession.user(),
                "Submitted welfare claim " + reference,
                "welfare_claim",
                claim.getId(),
                request.getRemoteAddr());

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(WelfareClaimResponse.from(claim, member)));
    }

    @PatchMapping("/{claimId}/status")
    ResponseEntity<?> decideClaim(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String claimId,
            @Valid @RequestBody DecideWelfareClaimRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String status = body.status().trim();
        if (!DECISION_STATUSES.contains(status)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_WELFARE_CLAIM_STATUS", "Welfare claims can only be approved or rejected."));
        }

        return claimRepository.findById(claimId)
                .<ResponseEntity<?>>map(claim -> decideExistingClaim(claim, status, body.reason(), currentSession, request))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "WELFARE_CLAIM_NOT_FOUND", "Welfare claim not found.")));
    }

    @PostMapping("/{claimId}/payment")
    ResponseEntity<?> payClaim(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String claimId,
            @Valid @RequestBody PayWelfareClaimRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String channel = body.channel().trim();
        if (!PAYMENT_CHANNELS.contains(channel)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_WELFARE_PAYMENT_CHANNEL", "Unsupported welfare claim payment channel."));
        }

        return claimRepository.findById(claimId)
                .<ResponseEntity<?>>map(claim -> payApprovedClaim(claim, channel, currentSession, request))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "WELFARE_CLAIM_NOT_FOUND", "Welfare claim not found.")));
    }

    private ResponseEntity<?> decideExistingClaim(
            WelfareClaim claim,
            String status,
            String reason,
            AuthService.CurrentSession currentSession,
            HttpServletRequest request) {
        if (!canAccess(currentSession, claim.getTenantId())) return tenantAccessDenied();
        if (!"submitted".equals(claim.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "WELFARE_CLAIM_ALREADY_DECIDED", "Only submitted welfare claims can be decided."));
        }
        if ("rejected".equals(status) && (reason == null || reason.isBlank())) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "WELFARE_REJECTION_REASON_REQUIRED", "A rejection reason is required."));
        }

        if ("approved".equals(status)) {
            claim.approve(currentSession.user().getId());
        } else {
            claim.reject(currentSession.user().getId(), reason.trim());
        }
        WelfareClaim saved = claimRepository.save(claim);
        auditService.record(
                saved.getTenantId(),
                currentSession.user(),
                ("approved".equals(status) ? "Approved" : "Rejected") + " welfare claim " + saved.getReference(),
                "welfare_claim",
                saved.getId(),
                request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(WelfareClaimResponse.from(saved, memberRepository.findById(saved.getMemberId()).orElse(null))));
    }

    private ResponseEntity<?> payApprovedClaim(
            WelfareClaim claim,
            String channel,
            AuthService.CurrentSession currentSession,
            HttpServletRequest request) {
        if (!canAccess(currentSession, claim.getTenantId())) return tenantAccessDenied();
        if (!"approved".equals(claim.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "WELFARE_CLAIM_NOT_PAYABLE", "Only approved welfare claims can be paid."));
        }
        if (periodService.isClosed(claim.getTenantId(), java.time.LocalDate.now())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "ACCOUNTING_PERIOD_CLOSED", "Accounting period " + periodService.periodKey(java.time.LocalDate.now()) + " is closed."));
        }
        Member member = memberRepository.findById(claim.getMemberId()).orElse(null);
        if (member == null) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_MEMBER", "Member does not exist for this tenant."));
        }
        if (!member.hasEnoughWelfare(claim.getAmount())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "INSUFFICIENT_WELFARE", "Member welfare balance is too low for this claim payment."));
        }

        member.applyWelfareClaimPayment(claim.getAmount());
        memberRepository.save(member);
        claim.pay(currentSession.user().getId(), channel);
        WelfareClaim saved = claimRepository.save(claim);
        auditService.record(
                saved.getTenantId(),
                currentSession.user(),
                "Paid welfare claim " + saved.getReference(),
                "welfare_claim",
                saved.getId(),
                request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(WelfareClaimResponse.from(saved, member)));
    }

    private List<WelfareClaimResponse> toResponses(List<WelfareClaim> claims) {
        Map<String, Member> members = memberRepository.findAllById(claims.stream().map(WelfareClaim::getMemberId).collect(Collectors.toSet()))
                .stream()
                .collect(Collectors.toMap(Member::getId, Function.identity()));
        return claims.stream()
                .map(claim -> WelfareClaimResponse.from(claim, members.get(claim.getMemberId())))
                .toList();
    }

    private Member scopedMember(String tenantId, String memberId) {
        return memberRepository.findById(memberId)
                .filter(candidate -> candidate.getTenantId().equals(tenantId))
                .orElse(null);
    }

    private String tenantScope(AuthService.CurrentSession currentSession, String requestedTenantId) {
        if (authService.isPlatform(currentSession.user())) {
            return requestedTenantId == null || requestedTenantId.isBlank() ? null : requestedTenantId.trim();
        }
        if (requestedTenantId == null || requestedTenantId.isBlank()) return currentSession.user().getTenantId();
        return requestedTenantId.trim().equals(currentSession.user().getTenantId()) ? requestedTenantId.trim() : null;
    }

    private boolean canAccess(AuthService.CurrentSession currentSession, String tenantId) {
        return authService.isPlatform(currentSession.user()) || tenantId.equals(currentSession.user().getTenantId());
    }

    private String referenceForTenant(String tenantId) {
        String prefix = "tenant_lake".equals(tenantId) ? "LFS" : "GVS";
        return prefix + "-WCL-" + String.format("%04d", claimRepository.countByTenantId(tenantId) + 1);
    }

    private ResponseEntity<ApiErrorResponse> tenantAccessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access welfare claims for another tenant."));
    }

    record SubmitWelfareClaimRequest(
            String tenantId,
            @NotBlank String memberId,
            @NotBlank String claimType,
            @NotNull BigDecimal amount,
            String reference,
            String description) {
    }

    record DecideWelfareClaimRequest(@NotBlank String status, String reason) {
    }

    record PayWelfareClaimRequest(@NotBlank String channel) {
    }
}
