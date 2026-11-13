package com.methaltech.sacco.loan;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.branch.Branch;
import com.methaltech.sacco.branch.BranchRepository;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/loans/{loanId}/recoveries")
@RequiredArgsConstructor
class LoanRecoveryController {

    private final LoanRepository loanRepository;
    private final LoanRecoveryCaseRepository recoveryRepository;
    private final LoanRecoveryService recoveryService;
    private final MemberRepository memberRepository;
    private final BranchRepository branchRepository;
    private final AuthService authService;
    private final AuditService auditService;

    @GetMapping
    ResponseEntity<?> list(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String loanId) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!authService.hasPermission(session.user(), "loans:view")) return authService.permissionRequired("loans:view");
        Loan loan = loanRepository.findById(loanId).orElse(null);
        if (loan == null) return notFound("LOAN_NOT_FOUND", "Loan not found.");
        ResponseEntity<?> access = accessCheck(session, loan);
        return access != null ? access : ResponseEntity.ok(ApiResponse.of(recoveryService.list(loanId)));
    }

    @PostMapping
    ResponseEntity<?> open(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String loanId,
            @Valid @RequestBody OpenRecoveryRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!authService.hasPermission(session.user(), "loan-recovery:create")) {
            return authService.permissionRequired("loan-recovery:create");
        }
        Loan loan = loanRepository.findById(loanId).orElse(null);
        if (loan == null) return notFound("LOAN_NOT_FOUND", "Loan not found.");
        ResponseEntity<?> access = accessCheck(session, loan);
        if (access != null) return access;
        try {
            String recoveryMethod = body.recoveryMethod();
            if (recoveryMethod == null || recoveryMethod.isBlank()) {
                recoveryMethod = Boolean.FALSE.equals(body.includeGuarantors())
                        ? LoanRecoveryCase.BORROWER_SAVINGS
                        : LoanRecoveryCase.GUARANTOR_SHORTFALL;
            }
            boolean sendNotice = Boolean.TRUE.equals(body.sendNotice())
                    || (body.noticeReference() != null && !body.noticeReference().isBlank())
                    || body.noticeServedAt() != null;
            LoanRecoveryResponse response = recoveryService.open(
                    loan, body.reason(), recoveryMethod, body.noticeReference(), body.noticeServedAt(),
                    sendNotice, session.user().getId());
            auditService.record(loan.getTenantId(), session.user(), "Posted loan recovery " + response.reference(),
                    "loan_recovery", response.id(), request.getRemoteAddr());
            return ResponseEntity.status(201).body(ApiResponse.of(response));
        } catch (LoanRecoveryException exception) {
            return recoveryError(exception);
        }
    }

    @PostMapping("/{caseId}/submit")
    ResponseEntity<?> submit(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String loanId,
            @PathVariable String caseId,
            HttpServletRequest request) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!authService.hasPermission(session.user(), "loan-recovery:create")) {
            return authService.permissionRequired("loan-recovery:create");
        }
        CaseContext context = caseContext(session, loanId, caseId);
        if (context.error() != null) return context.error();
        try {
            LoanRecoveryResponse response = recoveryService.submit(context.recoveryCase(), session.user().getId());
            auditService.record(context.loan().getTenantId(), session.user(), "Posted legacy loan recovery " + response.reference(),
                    "loan_recovery", response.id(), request.getRemoteAddr());
            return ResponseEntity.ok(ApiResponse.of(response));
        } catch (LoanRecoveryException exception) {
            return recoveryError(exception);
        }
    }

    @PostMapping("/{caseId}/decision")
    ResponseEntity<?> decide(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String loanId,
            @PathVariable String caseId,
            @Valid @RequestBody RecoveryDecisionRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!authService.hasPermission(session.user(), "loan-recovery:create")) {
            return authService.permissionRequired("loan-recovery:create");
        }
        CaseContext context = caseContext(session, loanId, caseId);
        if (context.error() != null) return context.error();
        try {
            String decision = body.status().trim().toLowerCase();
            LoanRecoveryResponse response = recoveryService.decide(
                    context.recoveryCase(), decision, body.reason(), session.user().getId());
            auditService.record(context.loan().getTenantId(), session.user(),
                    ("posted".equals(decision) ? "Posted" : "Rejected") + " loan recovery " + response.reference(),
                    "loan_recovery", response.id(), request.getRemoteAddr());
            return ResponseEntity.ok(ApiResponse.of(response));
        } catch (LoanRecoveryException exception) {
            return recoveryError(exception);
        }
    }

    private CaseContext caseContext(AuthService.CurrentSession session, String loanId, String caseId) {
        Loan loan = loanRepository.findById(loanId).orElse(null);
        if (loan == null) return new CaseContext(null, null, notFound("LOAN_NOT_FOUND", "Loan not found."));
        ResponseEntity<?> access = accessCheck(session, loan);
        if (access != null) return new CaseContext(loan, null, access);
        LoanRecoveryCase recoveryCase = recoveryRepository.findById(caseId).orElse(null);
        if (recoveryCase == null || !loanId.equals(recoveryCase.getLoanId())) {
            return new CaseContext(loan, null, notFound("LOAN_RECOVERY_NOT_FOUND", "Loan recovery case not found."));
        }
        return new CaseContext(loan, recoveryCase, null);
    }

    private ResponseEntity<?> accessCheck(AuthService.CurrentSession session, Loan loan) {
        if (!authService.isPlatform(session.user()) && !loan.getTenantId().equals(session.user().getTenantId())) {
            return ResponseEntity.status(403).body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access another SACCO's loan recovery."));
        }
        Member borrower = memberRepository.findById(loan.getMemberId()).orElse(null);
        if (borrower == null) return notFound("BORROWER_NOT_FOUND", "Borrower not found.");
        if (!authService.isPlatform(session.user()) && !authService.hasPermission(session.user(), "tenants:manage")) {
            List<String> branches = branchRepository
                    .findByTenantIdAndManagerUserIdOrderByCodeAsc(loan.getTenantId(), session.user().getId())
                    .stream().map(Branch::getId).toList();
            if (!branches.isEmpty() && !branches.contains(borrower.getBranchId())) {
                return ResponseEntity.status(403).body(ApiErrorResponse.of(403, "BRANCH_ACCESS_DENIED", "Cannot access recovery outside assigned branches."));
            }
        }
        return null;
    }

    private ResponseEntity<?> recoveryError(LoanRecoveryException exception) {
        return ResponseEntity.status(exception.status())
                .body(ApiErrorResponse.of(exception.status(), exception.code(), exception.getMessage()));
    }

    private ResponseEntity<?> notFound(String code, String message) {
        return ResponseEntity.status(404).body(ApiErrorResponse.of(404, code, message));
    }

    record OpenRecoveryRequest(
            @NotBlank @Size(max = 500) String reason,
            @Size(max = 40) String recoveryMethod,
            @Size(max = 160) String noticeReference,
            LocalDate noticeServedAt,
            LocalDate graceEndsAt,
            Boolean sendNotice,
            Boolean includeGuarantors) {}

    record RecoveryDecisionRequest(@NotBlank String status, @Size(max = 500) String reason) {}
    private record CaseContext(Loan loan, LoanRecoveryCase recoveryCase, ResponseEntity<?> error) {}
}
