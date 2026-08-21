package com.methaltech.sacco.finance;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
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

/**
 * Chairperson-driven savings transfers and group deductions, under maker-checker control. The maker
 * creates a pending transfer (or a batch, one per selected member); a different checker posts or rejects
 * it. Posting applies the money movement atomically via {@link SavingsTransferService}.
 */
@RestController
@RequestMapping("/api/v1/savings-transfers")
@RequiredArgsConstructor
class SavingsTransferController {

    private static final Set<String> DESTINATIONS = Set.of("own_fund", "loan_repayment", "sacco_income", "another_member");
    private static final Set<String> GROUP_DESTINATIONS = Set.of("own_fund", "sacco_income");
    /** Destinations that always require a recorded member authorization (they move money away from the member). */
    private static final Set<String> AUTHORIZATION_REQUIRED = Set.of("sacco_income", "another_member");
    /** At or above this amount, a member authorization is mandatory regardless of destination. */
    private static final BigDecimal HIGH_VALUE_THRESHOLD = new BigDecimal("1000000");
    /** At or above this amount, two distinct checkers must approve before the transfer posts. */
    private static final BigDecimal DUAL_APPROVAL_THRESHOLD = new BigDecimal("5000000");

    private final SavingsTransferRepository repository;
    private final SavingsTransferService transferService;
    private final MemberRepository memberRepository;
    private final AuthService authService;
    private final AuditService auditService;

    @GetMapping
    ResponseEntity<?> list(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!authService.hasPermission(session.user(), "savings-transfer:view")) {
            return authService.permissionRequired("savings-transfer:view");
        }
        boolean platformAll = authService.isPlatform(session.user()) && (requestedTenantId == null || requestedTenantId.isBlank());
        if (platformAll) {
            return ResponseEntity.ok(ApiResponse.of(repository.findAllByOrderByTenantIdAscCreatedAtDesc().stream().map(SavingsTransferResponse::from).toList()));
        }
        String tenantId = resolveTenant(session, requestedTenantId);
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiErrorResponse.of(403, "TENANT_REQUIRED", "Select a SACCO."));
        }
        return ResponseEntity.ok(ApiResponse.of(repository.findByTenantIdOrderByCreatedAtDesc(tenantId).stream().map(SavingsTransferResponse::from).toList()));
    }

    @PostMapping
    ResponseEntity<?> create(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestBody CreateRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!authService.hasPermission(session.user(), "savings-transfer:create")) {
            return authService.permissionRequired("savings-transfer:create");
        }
        String tenantId = resolveTenant(session, body == null ? null : body.tenantId());
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiErrorResponse.of(403, "TENANT_REQUIRED", "Select a SACCO."));
        }
        ResponseEntity<?> invalid = validateDestination(body, tenantId, DESTINATIONS, false);
        if (invalid != null) return invalid;
        if (authorizationMissing(body.destinationType().trim(), normalizeAmount(body.amount()), body.authorizationReference())) {
            return ResponseEntity.badRequest().body(ApiErrorResponse.of(400, "AUTHORIZATION_REQUIRED",
                    "A member authorization reference is required for this destination or amount."));
        }

        SavingsTransfer transfer = repository.save(new SavingsTransfer(
                "savtr_" + UUID.randomUUID(), tenantId, body.sourceMemberId().trim(), normalizeAmount(body.amount()),
                body.destinationType().trim(), trimOrNull(body.destinationFundCode()), trimOrNull(body.destinationMemberId()),
                trimOrNull(body.loanId()), null, "SAVTR-" + UUID.randomUUID(), trimOrNull(body.reason()),
                trimOrNull(body.authorizationReference()), null, session.user().getId()));
        auditService.record(tenantId, session.user(), "Created savings transfer " + transfer.getReference(), "savings_transfer", transfer.getId(), request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(SavingsTransferResponse.from(transfer)));
    }

    @PostMapping("/group-deduction")
    ResponseEntity<?> groupDeduction(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestBody GroupDeductionRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!authService.hasPermission(session.user(), "savings-transfer:create")) {
            return authService.permissionRequired("savings-transfer:create");
        }
        String tenantId = resolveTenant(session, body == null ? null : body.tenantId());
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiErrorResponse.of(403, "TENANT_REQUIRED", "Select a SACCO."));
        }
        String destinationType = body == null || body.destinationType() == null ? "" : body.destinationType().trim();
        if (!GROUP_DESTINATIONS.contains(destinationType)) {
            return ResponseEntity.badRequest().body(ApiErrorResponse.of(400, "INVALID_GROUP_DESTINATION", "Group deductions support own_fund or sacco_income destinations."));
        }
        // A group deduction of member savings must be backed by a board/AGM resolution.
        if (body.resolutionReference() == null || body.resolutionReference().isBlank()) {
            return ResponseEntity.badRequest().body(ApiErrorResponse.of(400, "RESOLUTION_REQUIRED",
                    "A board/AGM resolution reference is required to deduct member savings as a group."));
        }
        BigDecimal amount = normalizeAmount(body.amount());
        if (amount.signum() <= 0) {
            return ResponseEntity.badRequest().body(ApiErrorResponse.of(400, "INVALID_AMOUNT", "Amount must be greater than zero."));
        }
        List<String> memberIds = body.memberIds() == null ? List.of()
                : body.memberIds().stream().filter(id -> id != null && !id.isBlank()).map(String::trim).distinct().toList();
        if (memberIds.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiErrorResponse.of(400, "NO_MEMBERS", "Select at least one member for the group deduction."));
        }
        if ("own_fund".equals(destinationType) && (body.destinationFundCode() == null || body.destinationFundCode().isBlank() || "savings".equals(body.destinationFundCode().trim()))) {
            return ResponseEntity.badRequest().body(ApiErrorResponse.of(400, "INVALID_DESTINATION_FUND", "Choose a destination fund other than savings."));
        }

        String batchId = "batch_" + UUID.randomUUID();
        List<SavingsTransferResponse> created = new ArrayList<>();
        for (String memberId : memberIds) {
            Member member = memberRepository.findById(memberId).filter(candidate -> tenantId.equals(candidate.getTenantId())).orElse(null);
            if (member == null) continue;
            SavingsTransfer transfer = repository.save(new SavingsTransfer(
                    "savtr_" + UUID.randomUUID(), tenantId, member.getId(), amount, destinationType,
                    trimOrNull(body.destinationFundCode()), null, null, batchId,
                    "SAVTR-" + UUID.randomUUID(), trimOrNull(body.reason()),
                    trimOrNull(body.authorizationReference()), trimOrNull(body.resolutionReference()), session.user().getId()));
            created.add(SavingsTransferResponse.from(transfer));
        }
        if (created.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiErrorResponse.of(400, "NO_MEMBERS", "None of the selected members were found in this SACCO."));
        }
        auditService.record(tenantId, session.user(),
                "Created group savings deduction " + batchId + " for " + created.size() + " member(s)",
                "savings_transfer", batchId, request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(new GroupDeductionResponse(batchId, created.size(), created)));
    }

    @PatchMapping("/{id}/decision")
    ResponseEntity<?> decide(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String id,
            @RequestBody DecisionRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!authService.hasPermission(session.user(), "savings-transfer:approve")) {
            return authService.permissionRequired("savings-transfer:approve");
        }
        SavingsTransfer transfer = repository.findById(id).orElse(null);
        if (transfer == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiErrorResponse.of(404, "TRANSFER_NOT_FOUND", "Savings transfer was not found."));
        }
        if (!authService.isPlatform(session.user()) && !transfer.getTenantId().equals(session.user().getTenantId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot decide another SACCO's transfer."));
        }
        if (!"pending".equals(transfer.getStatus()) && !"awaiting_second_approval".equals(transfer.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiErrorResponse.of(409, "TRANSFER_NOT_PENDING", "Only pending transfers can be decided."));
        }
        String userId = session.user().getId();
        if (transfer.getCreatedByUserId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiErrorResponse.of(409, "MAKER_CHECKER_REQUIRED", "A different user must approve this transfer."));
        }
        String decision = body == null || body.status() == null ? "" : body.status().trim();
        SavingsTransfer saved;
        if ("posted".equals(decision)) {
            boolean dualRequired = transfer.getAmount().compareTo(DUAL_APPROVAL_THRESHOLD) >= 0;
            if (dualRequired && transfer.getFirstApprovedByUserId() == null) {
                // First of two approvals for a high-value transfer.
                transfer.recordFirstApproval(userId);
                saved = repository.save(transfer);
            } else {
                if (dualRequired && userId.equals(transfer.getFirstApprovedByUserId())) {
                    return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiErrorResponse.of(409, "SECOND_APPROVER_REQUIRED", "A second, different checker must give the final approval for this high-value transfer."));
                }
                try {
                    saved = transferService.post(transfer, userId);
                } catch (SavingsTransferException exception) {
                    return ResponseEntity.status(exception.status()).body(ApiErrorResponse.of(exception.status(), exception.code(), exception.getMessage()));
                }
            }
        } else if ("rejected".equals(decision)) {
            transfer.reject(userId, body.reason() == null ? "" : body.reason().trim());
            saved = repository.save(transfer);
        } else {
            return ResponseEntity.badRequest().body(ApiErrorResponse.of(400, "INVALID_DECISION", "Decision must be posted or rejected."));
        }
        auditService.record(saved.getTenantId(), session.user(),
                "Decided savings transfer " + saved.getReference() + " as " + saved.getStatus(),
                "savings_transfer", saved.getId(), request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(SavingsTransferResponse.from(saved)));
    }

    @PostMapping("/{id}/reverse")
    ResponseEntity<?> reverse(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String id,
            @RequestBody(required = false) DecisionRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!authService.hasPermission(session.user(), "savings-transfer:approve")) {
            return authService.permissionRequired("savings-transfer:approve");
        }
        SavingsTransfer transfer = repository.findById(id).orElse(null);
        if (transfer == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiErrorResponse.of(404, "TRANSFER_NOT_FOUND", "Savings transfer was not found."));
        }
        if (!authService.isPlatform(session.user()) && !transfer.getTenantId().equals(session.user().getTenantId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot reverse another SACCO's transfer."));
        }
        String reason = body == null || body.reason() == null ? "" : body.reason().trim();
        SavingsTransfer saved;
        try {
            saved = transferService.reverse(transfer, reason.isBlank() ? "Reversed" : reason);
        } catch (SavingsTransferException exception) {
            return ResponseEntity.status(exception.status()).body(ApiErrorResponse.of(exception.status(), exception.code(), exception.getMessage()));
        }
        auditService.record(saved.getTenantId(), session.user(),
                "Reversed savings transfer " + saved.getReference(), "savings_transfer", saved.getId(), request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(SavingsTransferResponse.from(saved)));
    }

    private ResponseEntity<?> validateDestination(CreateRequest body, String tenantId, Set<String> allowed, boolean group) {
        if (body == null || body.sourceMemberId() == null || body.sourceMemberId().isBlank()) {
            return ResponseEntity.badRequest().body(ApiErrorResponse.of(400, "SOURCE_MEMBER_REQUIRED", "A source member is required."));
        }
        if (normalizeAmount(body.amount()).signum() <= 0) {
            return ResponseEntity.badRequest().body(ApiErrorResponse.of(400, "INVALID_AMOUNT", "Amount must be greater than zero."));
        }
        String destinationType = body.destinationType() == null ? "" : body.destinationType().trim();
        if (!allowed.contains(destinationType)) {
            return ResponseEntity.badRequest().body(ApiErrorResponse.of(400, "INVALID_DESTINATION", "Unsupported transfer destination."));
        }
        Member source = memberRepository.findById(body.sourceMemberId().trim()).filter(member -> tenantId.equals(member.getTenantId())).orElse(null);
        if (source == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiErrorResponse.of(404, "SOURCE_MEMBER_NOT_FOUND", "Source member was not found in this SACCO."));
        }
        if ("own_fund".equals(destinationType) && (body.destinationFundCode() == null || body.destinationFundCode().isBlank() || "savings".equals(body.destinationFundCode().trim()))) {
            return ResponseEntity.badRequest().body(ApiErrorResponse.of(400, "INVALID_DESTINATION_FUND", "Choose a destination fund other than savings."));
        }
        if ("another_member".equals(destinationType)) {
            String destId = body.destinationMemberId() == null ? "" : body.destinationMemberId().trim();
            if (destId.isBlank() || destId.equals(body.sourceMemberId().trim())) {
                return ResponseEntity.badRequest().body(ApiErrorResponse.of(400, "INVALID_DESTINATION_MEMBER", "Choose a different destination member."));
            }
        }
        if ("loan_repayment".equals(destinationType) && (body.loanId() == null || body.loanId().isBlank())) {
            return ResponseEntity.badRequest().body(ApiErrorResponse.of(400, "LOAN_REQUIRED", "A loan is required for a loan-repayment transfer."));
        }
        return null;
    }

    private String resolveTenant(AuthService.CurrentSession session, String requestedTenantId) {
        if (authService.isPlatform(session.user())) {
            return requestedTenantId == null || requestedTenantId.isBlank() ? null : requestedTenantId.trim();
        }
        if (requestedTenantId != null && !requestedTenantId.isBlank() && !requestedTenantId.trim().equals(session.user().getTenantId())) {
            return null;
        }
        return session.user().getTenantId();
    }

    /** Member authorization is mandatory for money-away destinations and for high-value transfers. */
    private boolean authorizationMissing(String destinationType, BigDecimal amount, String authorizationReference) {
        boolean required = AUTHORIZATION_REQUIRED.contains(destinationType) || amount.compareTo(HIGH_VALUE_THRESHOLD) >= 0;
        return required && (authorizationReference == null || authorizationReference.isBlank());
    }

    private static BigDecimal normalizeAmount(BigDecimal amount) {
        return amount == null ? BigDecimal.ZERO : amount;
    }

    private static String trimOrNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    record CreateRequest(String tenantId, String sourceMemberId, BigDecimal amount, String destinationType,
                         String destinationFundCode, String destinationMemberId, String loanId, String reason,
                         String authorizationReference) {
    }

    record GroupDeductionRequest(String tenantId, List<String> memberIds, BigDecimal amount, String destinationType,
                                 String destinationFundCode, String reason, String authorizationReference, String resolutionReference) {
    }

    record GroupDeductionResponse(String batchId, int created, List<SavingsTransferResponse> transfers) {
    }

    record DecisionRequest(String status, String reason) {
    }
}
