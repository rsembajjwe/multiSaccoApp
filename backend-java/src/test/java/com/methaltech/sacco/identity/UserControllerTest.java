package com.methaltech.sacco.identity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberRepository;
import com.methaltech.sacco.security.PasswordHasher;
import com.methaltech.sacco.security.TokenGenerator;
import com.methaltech.sacco.tenant.SaccoOfficialAssignment;
import com.methaltech.sacco.tenant.SaccoOfficialAssignmentRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class UserControllerTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final AuthService authService = mock(AuthService.class);
    private final PasswordHasher passwordHasher = mock(PasswordHasher.class);
    private final AuditService auditService = mock(AuditService.class);
    private final RoleRepository roleRepository = mock(RoleRepository.class);
    private final UserRoleRepository userRoleRepository = mock(UserRoleRepository.class);
    private final AuthSessionRepository authSessionRepository = mock(AuthSessionRepository.class);
    private final PasswordResetRequestRepository resetRepository = mock(PasswordResetRequestRepository.class);
    private final TokenGenerator tokenGenerator = mock(TokenGenerator.class);
    private final DemoCredentialPolicy demoCredentialPolicy = mock(DemoCredentialPolicy.class);
    private final PlatformSecurityPolicyService securityPolicy = mock(PlatformSecurityPolicyService.class);
    private final MemberRepository memberRepository = mock(MemberRepository.class);
    private final SaccoOfficialAssignmentRepository assignmentRepository = mock(SaccoOfficialAssignmentRepository.class);
    private final DefaultSaccoRoleProvisioningService roleProvisioning = mock(DefaultSaccoRoleProvisioningService.class);
    private final StaffOnboardingService staffOnboardingService = mock(StaffOnboardingService.class);
    private final HttpServletRequest request = mock(HttpServletRequest.class);
    private final User admin = user("admin", "tenant_one", "Chairperson", "chair@example.com");
    private final User platform = user("platform", "tenant_platform", "Platform Admin", "platform@example.com");
    private final Role chairRole = new Role("role_chair", "tenant_one", "Chairperson", true, "system");
    private final UserController controller = new UserController(userRepository, authService, passwordHasher,
            auditService, roleRepository, userRoleRepository, authSessionRepository, resetRepository,
            tokenGenerator, demoCredentialPolicy, securityPolicy, memberRepository, assignmentRepository,
            roleProvisioning, staffOnboardingService);

    @BeforeEach
    void configureDefaults() {
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        when(authService.isPlatform(platform)).thenReturn(true);
        when(userRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(resetRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRoleRepository.findByIdUserId("admin"))
                .thenReturn(List.of(new UserRole("admin", "role_chair", "tenant_one")));
        when(roleRepository.findAllById(List.of("role_chair"))).thenReturn(List.of(chairRole));
        when(passwordHasher.hash(any())).thenReturn(new PasswordHasher.PasswordHash("hash", "salt"));
        when(securityPolicy.passwordViolations(any())).thenReturn(List.of());
        when(demoCredentialPolicy.demoLoginsEnabled()).thenReturn(true);
        when(staffOnboardingService.createDemoUser(any(), any(), any(), any(), any()))
                .thenAnswer(invocation -> user(
                        "created",
                        invocation.getArgument(0),
                        invocation.getArgument(1),
                        invocation.getArgument(2)));
    }

    @Test
    void listUsersRequiresPermissionScopesTenantAndHidesDeletedUsers() {
        stubAuthErrors();
        assertEquals(HttpStatus.UNAUTHORIZED, controller.listUsers(null).getStatusCode());
        when(authService.currentSession("Bearer denied")).thenReturn(session(admin));
        assertEquals(HttpStatus.FORBIDDEN, controller.listUsers("Bearer denied").getStatusCode());

        allow("Bearer admin", admin, "users:view");
        User active = user("active", "tenant_one", "Active User", "active@example.com");
        User deleted = user("deleted", "tenant_one", "Deleted User", "deleted@example.com");
        deleted.changeStatus("deleted");
        when(userRepository.findByTenantIdOrderByFullNameAsc("tenant_one")).thenReturn(List.of(active, deleted));
        ResponseEntity<?> response = controller.listUsers("Bearer admin");
        assertEquals(1, ((List<?>) ((ApiResponse<?>) response.getBody()).data()).size());

        allow("Bearer platform", platform, "users:view");
        when(userRepository.findAllByOrderByFullNameAsc()).thenReturn(List.of(active));
        assertEquals(HttpStatus.OK, controller.listUsers("Bearer platform").getStatusCode());
    }

    @Test
    void createUserEnforcesAdministratorTenantUniquenessAndPasswordPolicy() {
        allow("Bearer admin", admin, "users:create");
        UserController.CreateUserRequest foreign = new UserController.CreateUserRequest(
                "tenant_two", "User", "USER@example.com", null, null, "StrongPassword1!");
        assertError(controller.createUser("Bearer admin", foreign, request),
                HttpStatus.FORBIDDEN, "TENANT_ACCESS_DENIED");

        UserController.CreateUserRequest body = new UserController.CreateUserRequest(
                null, " New User ", " USER@example.com ", " +256700000001 ", null, "StrongPassword1!");
        when(userRepository.existsByTenantIdAndEmailIgnoreCase("tenant_one", "user@example.com")).thenReturn(true);
        assertError(controller.createUser("Bearer admin", body, request), HttpStatus.CONFLICT, "USER_EXISTS");

        when(userRepository.existsByTenantIdAndEmailIgnoreCase("tenant_one", "user@example.com")).thenReturn(false);
        when(securityPolicy.passwordViolations("StrongPassword1!")).thenReturn(List.of("length"));
        when(securityPolicy.passwordPolicyMessage(List.of("length"))).thenReturn("Password is too short.");
        assertError(controller.createUser("Bearer admin", body, request), HttpStatus.BAD_REQUEST, "WEAK_PASSWORD");

        when(securityPolicy.passwordViolations("StrongPassword1!")).thenReturn(List.of());
        ResponseEntity<?> created = controller.createUser("Bearer admin", body, request);
        assertEquals(HttpStatus.CREATED, created.getStatusCode());
        UserResponse saved = (UserResponse) ((ApiResponse<?>) created.getBody()).data();
        assertEquals("New User", saved.fullName());
        assertEquals("user@example.com", saved.email());
        verify(auditService).record(eq("tenant_one"), eq(admin), any(), eq("user"), any(), eq("127.0.0.1"));
    }

    @Test
    void updateUserValidatesExistenceTenantAndDuplicateEmailThenSaves() {
        allow("Bearer admin", admin, "users:create");
        assertError(controller.updateUser("Bearer admin", "missing",
                new UserController.UpdateUserRequest("Name", "name@example.com", null), request),
                HttpStatus.NOT_FOUND, "USER_NOT_FOUND");

        User foreign = user("foreign", "tenant_two", "Foreign", "foreign@example.com");
        when(userRepository.findById("foreign")).thenReturn(Optional.of(foreign));
        assertError(controller.updateUser("Bearer admin", "foreign",
                new UserController.UpdateUserRequest("Name", "name@example.com", null), request),
                HttpStatus.FORBIDDEN, "TENANT_ACCESS_DENIED");

        User target = user("target", "tenant_one", "Target", "target@example.com");
        User duplicate = user("duplicate", "tenant_one", "Duplicate", "duplicate@example.com");
        when(userRepository.findById("target")).thenReturn(Optional.of(target));
        when(userRepository.findByTenantIdAndEmailIgnoreCase("tenant_one", "duplicate@example.com"))
                .thenReturn(Optional.of(duplicate));
        assertError(controller.updateUser("Bearer admin", "target",
                new UserController.UpdateUserRequest("Updated", "duplicate@example.com", null), request),
                HttpStatus.CONFLICT, "USER_EXISTS");

        when(userRepository.findByTenantIdAndEmailIgnoreCase("tenant_one", "updated@example.com"))
                .thenReturn(Optional.empty());
        ResponseEntity<?> updated = controller.updateUser("Bearer admin", "target",
                new UserController.UpdateUserRequest(" Updated Name ", " UPDATED@example.com ", " 123 "), request);
        assertEquals(HttpStatus.OK, updated.getStatusCode());
        assertEquals("Updated Name", target.getFullName());
        assertEquals("updated@example.com", target.getEmail());
    }

    @Test
    void statusAndDeletePreventSelfLockoutAndApplyLifecycleChanges() {
        allow("Bearer admin", admin, "users:create");
        when(userRepository.findById("admin")).thenReturn(Optional.of(admin));
        assertError(controller.updateUserStatus("Bearer admin", "admin",
                new UserController.UpdateUserStatusRequest("suspended"), request),
                HttpStatus.BAD_REQUEST, "CANNOT_DISABLE_SELF");
        assertError(controller.deleteUser("Bearer admin", "admin", request),
                HttpStatus.BAD_REQUEST, "CANNOT_DELETE_SELF");

        User target = user("target", "tenant_one", "Target", "target@example.com");
        when(userRepository.findById("target")).thenReturn(Optional.of(target));
        assertError(controller.updateUserStatus("Bearer admin", "target",
                new UserController.UpdateUserStatusRequest("deleted"), request),
                HttpStatus.BAD_REQUEST, "INVALID_STATUS");
        assertEquals(HttpStatus.OK, controller.updateUserStatus("Bearer admin", "target",
                new UserController.UpdateUserStatusRequest(" SUSPENDED "), request).getStatusCode());
        assertEquals("suspended", target.getStatus());

        assertEquals(HttpStatus.OK, controller.deleteUser("Bearer admin", "target", request).getStatusCode());
        assertEquals("deleted", target.getStatus());
    }

    @Test
    void rolesValidateInputExistenceAndTenantBeforeReplacement() {
        allow("Bearer admin", admin, "users:create");
        allow("Bearer admin", admin, "users:view");
        User target = user("target", "tenant_one", "Target", "target@example.com");
        when(userRepository.findById("target")).thenReturn(Optional.of(target));
        when(userRoleRepository.findByIdUserId("target"))
                .thenReturn(List.of(new UserRole("target", "role_chair", "tenant_one")));
        assertEquals(HttpStatus.OK, controller.listUserRoles("Bearer admin", "target").getStatusCode());

        assertError(controller.replaceUserRoles("Bearer admin", "target",
                new UserController.ReplaceUserRolesRequest(List.of(" ")), request),
                HttpStatus.BAD_REQUEST, "ROLE_REQUIRED");
        when(roleRepository.findAllById(List.of("unknown"))).thenReturn(List.of());
        assertError(controller.replaceUserRoles("Bearer admin", "target",
                new UserController.ReplaceUserRolesRequest(List.of("unknown")), request),
                HttpStatus.BAD_REQUEST, "UNKNOWN_ROLE");

        Role foreignRole = new Role("foreign_role", "tenant_two", "Manager", false, "admin");
        when(roleRepository.findAllById(List.of("foreign_role"))).thenReturn(List.of(foreignRole));
        assertError(controller.replaceUserRoles("Bearer admin", "target",
                new UserController.ReplaceUserRolesRequest(List.of("foreign_role")), request),
                HttpStatus.BAD_REQUEST, "ROLE_TENANT_MISMATCH");

        Role manager = new Role("manager", "tenant_one", "Manager", false, "admin");
        when(roleRepository.findAllById(List.of("manager"))).thenReturn(List.of(manager));
        ResponseEntity<?> response = controller.replaceUserRoles("Bearer admin", "target",
                new UserController.ReplaceUserRolesRequest(List.of(" manager ", "manager")), request);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(userRoleRepository).deleteByIdUserId("target");
        verify(userRoleRepository).saveAll(any());
    }

    @Test
    void sessionRevocationAndMfaOperateOnlyOnOtherAccessibleUsers() {
        allow("Bearer admin", admin, "users:create");
        when(userRepository.findById("admin")).thenReturn(Optional.of(admin));
        assertError(controller.revokeUserSessions("Bearer admin", "admin", request),
                HttpStatus.BAD_REQUEST, "CANNOT_FORCE_LOGOUT_SELF");

        User target = user("target", "tenant_one", "Target", "target@example.com");
        when(userRepository.findById("target")).thenReturn(Optional.of(target));
        AuthSession active = new AuthSession("active", "target", "tenant_one", "hash",
                Instant.now().plusSeconds(3600), "127.0.0.1", "browser");
        AuthSession expired = new AuthSession("expired", "target", "tenant_one", "hash",
                Instant.now().minusSeconds(1));
        when(authSessionRepository.findByUserIdAndRevokedAtIsNull("target")).thenReturn(List.of(active, expired));
        ResponseEntity<?> revoked = controller.revokeUserSessions("Bearer admin", "target", request);
        assertEquals(1, ((UserController.SessionRevocationResponse)
                ((ApiResponse<?>) revoked.getBody()).data()).revokedSessions());

        assertEquals(HttpStatus.OK, controller.updateUserMfa("Bearer admin", "target",
                new UserController.UpdateUserMfaRequest(true), request).getStatusCode());
        assertTrue(target.isMfaEnabled());
        controller.updateUserMfa("Bearer admin", "target", new UserController.UpdateUserMfaRequest(false), request);
        assertFalse(target.isMfaEnabled());
    }

    @Test
    void passwordResetAndSessionHistoryHideProductionTokens() {
        allow("Bearer admin", admin, "users:create");
        User target = user("target", "tenant_one", "Target", "target@example.com");
        when(userRepository.findById("target")).thenReturn(Optional.of(target));
        when(tokenGenerator.createToken()).thenReturn("plain-token");
        when(tokenGenerator.hashToken("plain-token")).thenReturn("hashed-token");
        when(demoCredentialPolicy.demoLoginsEnabled()).thenReturn(false);

        ResponseEntity<?> response = controller.requestUserPasswordReset("Bearer admin", "target", request);
        UserController.UserPasswordResetResponse reset =
                (UserController.UserPasswordResetResponse) ((ApiResponse<?>) response.getBody()).data();
        assertNull(reset.resetToken());
        assertTrue(target.isPasswordResetRequired());

        PasswordResetRequest resetRequest = new PasswordResetRequest(
                "reset_one", "tenant_one", "target", "hash", Instant.now().plusSeconds(1800));
        when(resetRepository.findByUserIdOrderByCreatedAtDesc("target")).thenReturn(List.of(resetRequest));
        assertEquals(HttpStatus.OK, controller.listUserPasswordResets("Bearer admin", "target").getStatusCode());

        AuthSession session = new AuthSession("session_one", "target", "tenant_one", "hash",
                Instant.now().plusSeconds(3600), "127.0.0.1", "browser");
        when(authSessionRepository.findByUserIdAndRevokedAtIsNull("target")).thenReturn(List.of(session));
        assertEquals(HttpStatus.OK, controller.listUserSessions("Bearer admin", "target").getStatusCode());
        when(authSessionRepository.findById("session_one")).thenReturn(Optional.of(session));
        assertEquals(HttpStatus.OK,
                controller.revokeUserSession("Bearer admin", "target", "session_one", request).getStatusCode());
    }

    @Test
    void officialStaffAccessValidatesAssignmentAndLinksExistingUser() {
        allow("Bearer platform", platform, "users:create");
        UserController.OfficialStaffAccessRequest invalid =
                new UserController.OfficialStaffAccessRequest("missing", "auditor");
        assertError(controller.grantOfficialStaffAccess("Bearer platform", invalid, request),
                HttpStatus.BAD_REQUEST, "INVALID_OFFICIAL_MEMBER");

        Member member = mock(Member.class);
        when(member.getId()).thenReturn("member_one");
        when(member.getTenantId()).thenReturn("tenant_one");
        when(member.getEmail()).thenReturn("official@example.com");
        when(member.getPhone()).thenReturn("+256700000001");
        when(member.getFullName()).thenReturn("Official Member");
        when(member.getMembershipNo()).thenReturn("TEN-001");
        when(memberRepository.findById("member_one")).thenReturn(Optional.of(member));
        UserController.OfficialStaffAccessRequest body =
                new UserController.OfficialStaffAccessRequest("member_one", "chairman");
        assertError(controller.grantOfficialStaffAccess("Bearer platform", body, request),
                HttpStatus.CONFLICT, "OFFICIAL_ASSIGNMENT_REQUIRED");

        SaccoOfficialAssignment assignment = new SaccoOfficialAssignment(
                "assignment_one", "tenant_one", "chairperson", "member_one", "platform");
        when(assignmentRepository.findByTenantIdAndOffice("tenant_one", "chairperson"))
                .thenReturn(Optional.of(assignment));
        User staff = user("staff", "tenant_one", "Official Member", "official@example.com");
        when(userRepository.findByTenantIdAndEmailIgnoreCase("tenant_one", "official@example.com"))
                .thenReturn(Optional.of(staff));
        when(memberRepository.findFirstByLinkedUserId("staff")).thenReturn(Optional.empty());
        when(roleProvisioning.ensureOfficialRole("tenant_one", "chairperson", "platform"))
                .thenReturn("role_official");
        ResponseEntity<?> response = controller.grantOfficialStaffAccess("Bearer platform", body, request);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(member).linkStaffUser("staff");
        verify(memberRepository).save(member);
        verify(userRoleRepository).save(any(UserRole.class));
    }

    @Test
    void proprietorCanResendOfficialOnboardingThroughSelectedChannel() {
        allow("Bearer platform", platform, "users:create");
        Member member = mock(Member.class);
        when(member.getId()).thenReturn("member_one");
        when(member.getTenantId()).thenReturn("tenant_one");
        when(member.getLinkedUserId()).thenReturn("staff");
        when(memberRepository.findById("member_one")).thenReturn(Optional.of(member));
        when(assignmentRepository.findByTenantIdAndOffice("tenant_one", "treasurer"))
                .thenReturn(Optional.of(new SaccoOfficialAssignment(
                        "assignment_one", "tenant_one", "treasurer", "member_one", "platform")));
        User staff = new User(
                "staff", "tenant_one", "Treasurer", "treasurer@example.com", "+256700000001",
                "hash", "salt", "active");
        staff.beginOnboarding("email");
        when(userRepository.findById("staff")).thenReturn(Optional.of(staff));
        when(staffOnboardingService.reissueTemporaryPassword(staff, "sms")).thenAnswer(invocation -> {
            staff.beginOnboarding("sms");
            staff.markOnboardingSent();
            return staff;
        });

        ResponseEntity<?> response = controller.resendOfficialOnboarding(
                "Bearer platform",
                new UserController.ResendOfficialOnboardingRequest("member_one", "treasurer", "sms"),
                request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        UserController.ResendOfficialOnboardingResponse result =
                (UserController.ResendOfficialOnboardingResponse) ((ApiResponse<?>) response.getBody()).data();
        assertEquals("sms", result.deliveryChannel());
        assertEquals("***0001", result.recipient());
        assertEquals("sent", result.deliveryStatus());
        verify(staffOnboardingService).reissueTemporaryPassword(staff, "sms");
        verify(auditService).record(eq("tenant_one"), eq(platform), any(),
                eq("official_staff_access"), eq("staff"), eq("127.0.0.1"));
    }

    private void allow(String token, User user, String permission) {
        when(authService.currentSession(token)).thenReturn(session(user));
        when(authService.hasPermission(user, permission)).thenReturn(true);
    }

    private void stubAuthErrors() {
        when(authService.authRequired()).thenReturn(ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiErrorResponse.of(401, "AUTH_REQUIRED", "Authentication required.")));
        when(authService.permissionRequired(any())).thenReturn(ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "PERMISSION_REQUIRED", "Permission required.")));
    }

    private AuthService.CurrentSession session(User user) {
        return new AuthService.CurrentSession(null, user);
    }

    private User user(String id, String tenantId, String name, String email) {
        return new User(id, tenantId, name, email, "", "hash", "salt", "active");
    }

    private void assertError(ResponseEntity<?> response, HttpStatus status, String code) {
        assertEquals(status, response.getStatusCode());
        assertEquals(code, ((ApiErrorResponse) response.getBody()).error().code());
    }
}
