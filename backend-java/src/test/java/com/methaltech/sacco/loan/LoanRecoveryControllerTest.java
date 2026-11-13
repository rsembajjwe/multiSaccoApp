package com.methaltech.sacco.loan;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.branch.Branch;
import com.methaltech.sacco.branch.BranchRepository;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.identity.User;
import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class LoanRecoveryControllerTest {

    private final LoanRepository loanRepository = mock(LoanRepository.class);
    private final LoanRecoveryCaseRepository recoveryRepository = mock(LoanRecoveryCaseRepository.class);
    private final LoanRecoveryService recoveryService = mock(LoanRecoveryService.class);
    private final MemberRepository memberRepository = mock(MemberRepository.class);
    private final BranchRepository branchRepository = mock(BranchRepository.class);
    private final AuthService authService = mock(AuthService.class);
    private final AuditService auditService = mock(AuditService.class);
    private final HttpServletRequest request = mock(HttpServletRequest.class);
    private final User user = user("user_one", "tenant_one", "Loan Officer");
    private final User platform = user("platform_one", "tenant_platform", "Platform Admin");
    private final Loan loan = loan("loan_one", "tenant_one", "member_one");
    private final Member borrower = member("member_one", "branch_one");
    private final LoanRecoveryController controller = new LoanRecoveryController(loanRepository, recoveryRepository,
            recoveryService, memberRepository, branchRepository, authService, auditService);

    @BeforeEach
    void configureDefaults() {
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        when(loanRepository.findById(loan.getId())).thenReturn(Optional.of(loan));
        when(memberRepository.findById("member_one")).thenReturn(Optional.of(borrower));
        when(authService.isPlatform(platform)).thenReturn(true);
    }

    @Test
    void listRequiresAuthenticationPermissionAndExistingLoan() {
        stubAuthErrors();
        assertEquals(HttpStatus.UNAUTHORIZED, controller.list(null, "loan_one").getStatusCode());

        when(authService.currentSession("Bearer denied")).thenReturn(session(user));
        assertEquals(HttpStatus.FORBIDDEN, controller.list("Bearer denied", "loan_one").getStatusCode());

        allow("Bearer list", user, "loans:view");
        assertError(controller.list("Bearer list", "missing"), HttpStatus.NOT_FOUND, "LOAN_NOT_FOUND");
        LoanRecoveryResponse listed = response("recovery_one", "REC-1");
        when(recoveryService.list("loan_one")).thenReturn(List.of(listed));
        assertEquals(HttpStatus.OK, controller.list("Bearer list", "loan_one").getStatusCode());
    }

    @Test
    void accessChecksTenantBorrowerAndManagedBranches() {
        allow("Bearer platform", platform, "loans:view");
        when(memberRepository.findById("member_one")).thenReturn(Optional.empty());
        assertError(controller.list("Bearer platform", "loan_one"), HttpStatus.NOT_FOUND, "BORROWER_NOT_FOUND");

        Loan foreignLoan = loan("foreign", "tenant_two", "member_two");
        when(loanRepository.findById("foreign")).thenReturn(Optional.of(foreignLoan));
        allow("Bearer user", user, "loans:view");
        assertError(controller.list("Bearer user", "foreign"), HttpStatus.FORBIDDEN, "TENANT_ACCESS_DENIED");

        when(memberRepository.findById("member_one")).thenReturn(Optional.of(borrower));
        Branch branch = mock(Branch.class);
        when(branch.getId()).thenReturn("branch_two");
        when(branchRepository.findByTenantIdAndManagerUserIdOrderByCodeAsc("tenant_one", "user_one"))
                .thenReturn(List.of(branch));
        assertError(controller.list("Bearer user", "loan_one"), HttpStatus.FORBIDDEN, "BRANCH_ACCESS_DENIED");
    }

    @Test
    void openDefaultsMethodsAndNoticeFlagsThenAudits() {
        allow("Bearer create", user, "loan-recovery:create");
        LoanRecoveryResponse first = response("recovery_one", "REC-1");
        LoanRecoveryResponse second = response("recovery_two", "REC-2");
        when(recoveryService.open(eq(loan), any(), any(), any(), any(), any(Boolean.class), eq("user_one")))
                .thenReturn(first, second);

        LoanRecoveryController.OpenRecoveryRequest savings = new LoanRecoveryController.OpenRecoveryRequest(
                "Savings recovery", " ", null, null, null, false, false);
        assertEquals(HttpStatus.CREATED, controller.open("Bearer create", "loan_one", savings, request).getStatusCode());
        verify(recoveryService).open(loan, "Savings recovery", LoanRecoveryCase.BORROWER_SAVINGS,
                null, null, false, "user_one");

        LoanRecoveryController.OpenRecoveryRequest guarantors = new LoanRecoveryController.OpenRecoveryRequest(
                "Shortfall", null, " NOTICE-1 ", null, null, false, true);
        controller.open("Bearer create", "loan_one", guarantors, request);
        verify(recoveryService).open(loan, "Shortfall", LoanRecoveryCase.GUARANTOR_SHORTFALL,
                " NOTICE-1 ", null, true, "user_one");
        verify(auditService, org.mockito.Mockito.times(2)).record(eq("tenant_one"), eq(user), any(),
                eq("loan_recovery"), any(), eq("127.0.0.1"));
    }

    @Test
    void openConvertsDomainFailuresToApiErrors() {
        allow("Bearer create", user, "loan-recovery:create");
        when(recoveryService.open(any(), any(), any(), any(), any(), any(Boolean.class), any()))
                .thenThrow(new LoanRecoveryException(409, "RECOVERY_CONFLICT", "Already open."));
        ResponseEntity<?> response = controller.open("Bearer create", "loan_one",
                new LoanRecoveryController.OpenRecoveryRequest("Reason", "method", null, null, null, false, true),
                request);
        assertError(response, HttpStatus.CONFLICT, "RECOVERY_CONFLICT");
    }

    @Test
    void submitValidatesCaseOwnershipAndAuditsSuccess() {
        allow("Bearer create", user, "loan-recovery:create");
        assertError(controller.submit("Bearer create", "loan_one", "missing", request),
                HttpStatus.NOT_FOUND, "LOAN_RECOVERY_NOT_FOUND");

        LoanRecoveryCase wrongLoan = mock(LoanRecoveryCase.class);
        when(wrongLoan.getLoanId()).thenReturn("another_loan");
        when(recoveryRepository.findById("wrong")).thenReturn(Optional.of(wrongLoan));
        assertError(controller.submit("Bearer create", "loan_one", "wrong", request),
                HttpStatus.NOT_FOUND, "LOAN_RECOVERY_NOT_FOUND");

        LoanRecoveryCase recoveryCase = mock(LoanRecoveryCase.class);
        when(recoveryCase.getLoanId()).thenReturn("loan_one");
        when(recoveryRepository.findById("recovery_one")).thenReturn(Optional.of(recoveryCase));
        LoanRecoveryResponse submitted = response("recovery_one", "REC-1");
        when(recoveryService.submit(recoveryCase, "user_one")).thenReturn(submitted);
        assertEquals(HttpStatus.OK,
                controller.submit("Bearer create", "loan_one", "recovery_one", request).getStatusCode());
        verify(auditService).record(eq("tenant_one"), eq(user), any(), eq("loan_recovery"),
                eq("recovery_one"), eq("127.0.0.1"));
    }

    @Test
    void decisionNormalizesStatusAndHandlesDomainFailure() {
        allow("Bearer create", user, "loan-recovery:create");
        LoanRecoveryCase recoveryCase = mock(LoanRecoveryCase.class);
        when(recoveryCase.getLoanId()).thenReturn("loan_one");
        when(recoveryRepository.findById("recovery_one")).thenReturn(Optional.of(recoveryCase));
        LoanRecoveryResponse decided = response("recovery_one", "REC-1");
        when(recoveryService.decide(recoveryCase, "posted", "Approved", "user_one"))
                .thenReturn(decided);

        LoanRecoveryController.RecoveryDecisionRequest posted =
                new LoanRecoveryController.RecoveryDecisionRequest(" POSTED ", "Approved");
        assertEquals(HttpStatus.OK,
                controller.decide("Bearer create", "loan_one", "recovery_one", posted, request).getStatusCode());

        when(recoveryService.decide(recoveryCase, "rejected", "Invalid", "user_one"))
                .thenThrow(new LoanRecoveryException(400, "INVALID_RECOVERY", "Invalid decision."));
        assertError(controller.decide("Bearer create", "loan_one", "recovery_one",
                new LoanRecoveryController.RecoveryDecisionRequest("rejected", "Invalid"), request),
                HttpStatus.BAD_REQUEST, "INVALID_RECOVERY");
    }

    private void allow(String token, User currentUser, String permission) {
        when(authService.currentSession(token)).thenReturn(session(currentUser));
        when(authService.hasPermission(currentUser, permission)).thenReturn(true);
    }

    private void stubAuthErrors() {
        when(authService.authRequired()).thenReturn(ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiErrorResponse.of(401, "AUTH_REQUIRED", "Authentication required.")));
        when(authService.permissionRequired(any())).thenReturn(ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "PERMISSION_REQUIRED", "Permission required.")));
    }

    private AuthService.CurrentSession session(User currentUser) {
        return new AuthService.CurrentSession(null, currentUser);
    }

    private User user(String id, String tenantId, String name) {
        User currentUser = mock(User.class);
        when(currentUser.getId()).thenReturn(id);
        when(currentUser.getTenantId()).thenReturn(tenantId);
        when(currentUser.getFullName()).thenReturn(name);
        return currentUser;
    }

    private Loan loan(String id, String tenantId, String memberId) {
        Loan value = mock(Loan.class);
        when(value.getId()).thenReturn(id);
        when(value.getTenantId()).thenReturn(tenantId);
        when(value.getMemberId()).thenReturn(memberId);
        return value;
    }

    private Member member(String id, String branchId) {
        Member value = mock(Member.class);
        when(value.getId()).thenReturn(id);
        when(value.getBranchId()).thenReturn(branchId);
        return value;
    }

    private LoanRecoveryResponse response(String id, String reference) {
        LoanRecoveryResponse value = mock(LoanRecoveryResponse.class);
        when(value.id()).thenReturn(id);
        when(value.reference()).thenReturn(reference);
        return value;
    }

    private void assertError(ResponseEntity<?> response, HttpStatus status, String code) {
        assertEquals(status, response.getStatusCode());
        assertEquals(code, ((ApiErrorResponse) response.getBody()).error().code());
    }
}
