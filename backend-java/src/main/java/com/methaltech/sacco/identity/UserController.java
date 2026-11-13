package com.methaltech.sacco.identity;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberRepository;
import com.methaltech.sacco.security.PasswordHasher;
import com.methaltech.sacco.security.TokenGenerator;
import com.methaltech.sacco.tenant.SaccoOfficialAssignment;
import com.methaltech.sacco.tenant.SaccoOfficialAssignmentRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
class UserController {

    private final UserRepository userRepository;
    private final AuthService authService;
    private final PasswordHasher passwordHasher;
    private final AuditService auditService;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final AuthSessionRepository authSessionRepository;
    private final PasswordResetRequestRepository passwordResetRequestRepository;
    private final TokenGenerator tokenGenerator;
    private final DemoCredentialPolicy demoCredentialPolicy;
    private final PlatformSecurityPolicyService platformSecurityPolicyService;
    private final MemberRepository memberRepository;
    private final SaccoOfficialAssignmentRepository officialAssignmentRepository;
    private final DefaultSaccoRoleProvisioningService defaultSaccoRoleProvisioningService;
    private final StaffOnboardingService staffOnboardingService;

    UserController(
            UserRepository userRepository,
            AuthService authService,
            PasswordHasher passwordHasher,
            AuditService auditService,
            RoleRepository roleRepository,
            UserRoleRepository userRoleRepository,
            AuthSessionRepository authSessionRepository,
            PasswordResetRequestRepository passwordResetRequestRepository,
            TokenGenerator tokenGenerator,
            DemoCredentialPolicy demoCredentialPolicy,
            PlatformSecurityPolicyService platformSecurityPolicyService,
            MemberRepository memberRepository,
            SaccoOfficialAssignmentRepository officialAssignmentRepository,
            DefaultSaccoRoleProvisioningService defaultSaccoRoleProvisioningService,
            StaffOnboardingService staffOnboardingService) {
        this.userRepository = userRepository;
        this.authService = authService;
        this.passwordHasher = passwordHasher;
        this.auditService = auditService;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.authSessionRepository = authSessionRepository;
        this.passwordResetRequestRepository = passwordResetRequestRepository;
        this.tokenGenerator = tokenGenerator;
        this.demoCredentialPolicy = demoCredentialPolicy;
        this.platformSecurityPolicyService = platformSecurityPolicyService;
        this.memberRepository = memberRepository;
        this.officialAssignmentRepository = officialAssignmentRepository;
        this.defaultSaccoRoleProvisioningService = defaultSaccoRoleProvisioningService;
        this.staffOnboardingService = staffOnboardingService;
    }

    @GetMapping
    ResponseEntity<?> listUsers(@RequestHeader(name = "Authorization", required = false) String authorization) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "users:view")) {
            return authService.permissionRequired("users:view");
        }

        List<User> users = authService.isPlatform(currentSession.user())
                ? userRepository.findAllByOrderByFullNameAsc()
                : userRepository.findByTenantIdOrderByFullNameAsc(currentSession.user().getTenantId());

        Instant now = Instant.now();
        Map<String, Long> activeSessionsByUser = users.stream()
                .collect(Collectors.toMap(
                        User::getId,
                        user -> activeSessionCount(user.getId(), now),
                        Long::sum));

        return ResponseEntity.ok(ApiResponse.of(users.stream()
                .filter(user -> !"deleted".equalsIgnoreCase(user.getStatus()))
                .map(user -> UserResponse.from(user, activeSessionsByUser.getOrDefault(user.getId(), 0L)))
                .toList()));
    }

    @PostMapping
    ResponseEntity<?> createUser(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody CreateUserRequest request,
            HttpServletRequest httpRequest) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "users:create")) {
            return authService.permissionRequired("users:create");
        }
        ResponseEntity<ApiErrorResponse> saccoAdminRequired = requireSaccoAdministratorForUserManagement(currentSession);
        if (saccoAdminRequired != null) return saccoAdminRequired;

        String tenantId = request.tenantId() == null || request.tenantId().isBlank()
                ? currentSession.user().getTenantId()
                : request.tenantId().trim();

        if (!authService.isPlatform(currentSession.user()) && !tenantId.equals(currentSession.user().getTenantId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot create a user in another tenant."));
        }
        if (tenantId.equals("tenant_platform")
                && !hasRole(currentSession.user(), "Platform Admin")
                && !hasRole(currentSession.user(), "Platform Super Admin")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "PLATFORM_SUPER_ADMIN_REQUIRED", "Only the Platform Super Admin can create platform users."));
        }

        String normalizedEmail = request.email() == null ? "" : request.email().trim().toLowerCase();
        String email = normalizedEmail.isBlank() ? null : normalizedEmail;
        String phone = request.phone() == null ? "" : request.phone().trim();
        String channel = request.deliveryChannel() == null || request.deliveryChannel().isBlank()
                ? "email"
                : request.deliveryChannel().trim().toLowerCase();
        if (!Set.of("email", "sms").contains(channel)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_DELIVERY_CHANNEL", "Choose email or SMS for temporary-password delivery."));
        }
        if ("email".equals(channel) && email == null) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "EMAIL_REQUIRED", "An active email address is required for email delivery."));
        }
        if ("sms".equals(channel) && !phone.matches("^\\+[1-9]\\d{7,14}$")) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "PHONE_REQUIRED", "A valid international phone number is required for SMS delivery."));
        }
        if (email != null && userRepository.existsByTenantIdAndEmailIgnoreCase(tenantId, email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "USER_EXISTS", "A user with that email already exists in this tenant."));
        }
        if (!phone.isBlank() && userRepository.existsByTenantIdAndPhone(tenantId, phone)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "USER_EXISTS", "A user with that phone number already exists in this tenant."));
        }

        User savedUser;
        if (demoCredentialPolicy.demoLoginsEnabled() && request.password() != null && !request.password().isBlank()) {
            List<String> passwordViolations = platformSecurityPolicyService.passwordViolations(request.password());
            if (!passwordViolations.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiErrorResponse.of(400, "WEAK_PASSWORD", platformSecurityPolicyService.passwordPolicyMessage(passwordViolations)));
            }
            savedUser = staffOnboardingService.createDemoUser(
                    tenantId, request.fullName().trim(), email, phone, request.password());
        } else {
            savedUser = staffOnboardingService.createUser(
                    tenantId, request.fullName().trim(), email, phone, channel);
        }
        auditService.record(
                tenantId,
                currentSession.user(),
                "Created user " + savedUser.getEmail(),
                "user",
                savedUser.getId(),
                httpRequest.getRemoteAddr());

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(UserResponse.from(savedUser)));
    }

    @PostMapping("/official-staff-access")
    @Transactional
    ResponseEntity<?> grantOfficialStaffAccess(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody OfficialStaffAccessRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.isPlatform(currentSession.user()) || !authService.hasPermission(currentSession.user(), "users:create")) {
            return authService.permissionRequired("users:create");
        }

        String office = normalizeOfficialOffice(body.office());
        Member member = memberRepository.findById(body.memberId().trim()).orElse(null);
        if (office == null || member == null) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_OFFICIAL_MEMBER", "Select an assigned chairperson, secretary, or treasurer member."));
        }
        SaccoOfficialAssignment assignment = officialAssignmentRepository
                .findByTenantIdAndOffice(member.getTenantId(), office)
                .filter(candidate -> candidate.getMemberId().equals(member.getId()))
                .orElse(null);
        if (assignment == null) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "OFFICIAL_ASSIGNMENT_REQUIRED", "Assign this member to the SACCO office before granting staff access."));
        }
        if (member.getEmail() == null || member.getEmail().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "OFFICIAL_EMAIL_REQUIRED", "Add an email address to the member before granting staff access."));
        }
        User user = member.getLinkedUserId() == null ? null : userRepository.findById(member.getLinkedUserId()).orElse(null);
        if (user == null) {
            user = userRepository.findByTenantIdAndEmailIgnoreCase(member.getTenantId(), member.getEmail()).orElse(null);
        }
        if (user == null) {
            user = staffOnboardingService.createUser(
                    member.getTenantId(),
                    member.getFullName(),
                    member.getEmail().trim().toLowerCase(),
                    member.getPhone() == null ? "" : member.getPhone().trim(),
                    "email");
        }
        boolean linkedElsewhere = memberRepository.findFirstByLinkedUserId(user.getId())
                .map(existing -> !existing.getId().equals(member.getId()))
                .orElse(false);
        if (linkedElsewhere) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "STAFF_ALREADY_LINKED", "That staff account is linked to another member."));
        }

        String roleId = defaultSaccoRoleProvisioningService.ensureOfficialRole(
                member.getTenantId(), office, currentSession.user().getId());
        if (!userRoleRepository.existsByIdUserIdAndIdRoleId(user.getId(), roleId)) {
            userRoleRepository.save(new UserRole(user.getId(), roleId, member.getTenantId()));
        }
        member.linkStaffUser(user.getId());
        memberRepository.save(member);
        auditService.record(
                member.getTenantId(),
                currentSession.user(),
                "Granted " + office + " staff access to member " + member.getMembershipNo(),
                "official_staff_access",
                user.getId(),
                request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(new OfficialStaffAccessResponse(
                member.getId(), user.getId(), office, user.getEmail(), true)));
    }

    @PutMapping("/{userId}")
    ResponseEntity<?> updateUser(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String userId,
            @Valid @RequestBody UpdateUserRequest request,
            HttpServletRequest httpRequest) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "users:create")) {
            return authService.permissionRequired("users:create");
        }
        ResponseEntity<ApiErrorResponse> saccoAdminRequired = requireSaccoAdministratorForUserManagement(currentSession);
        if (saccoAdminRequired != null) return saccoAdminRequired;

        User targetUser = userRepository.findById(userId).orElse(null);
        if (targetUser == null || "deleted".equalsIgnoreCase(targetUser.getStatus())) {
            return userNotFound();
        }
        if (!canAccessUser(currentSession, targetUser)) return tenantAccessDenied();
        if (!canManagePlatformUser(currentSession, targetUser)) {
            return platformSuperAdminRequired("update platform users");
        }

        String email = request.email().trim().toLowerCase();
        User existingUser = userRepository.findByTenantIdAndEmailIgnoreCase(targetUser.getTenantId(), email).orElse(null);
        if (existingUser != null && !existingUser.getId().equals(targetUser.getId()) && !"deleted".equalsIgnoreCase(existingUser.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "USER_EXISTS", "A user with that email already exists in this SACCO or platform account."));
        }

        targetUser.updateProfile(
                request.fullName().trim(),
                email,
                request.phone() == null ? "" : request.phone().trim());
        User savedUser = userRepository.save(targetUser);
        auditService.record(
                targetUser.getTenantId(),
                currentSession.user(),
                "Updated user " + savedUser.getEmail(),
                "user",
                savedUser.getId(),
                httpRequest.getRemoteAddr());

        return ResponseEntity.ok(ApiResponse.of(UserResponse.from(savedUser)));
    }

    @PatchMapping("/{userId}/status")
    ResponseEntity<?> updateUserStatus(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String userId,
            @Valid @RequestBody UpdateUserStatusRequest request,
            HttpServletRequest httpRequest) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "users:create")) {
            return authService.permissionRequired("users:create");
        }
        ResponseEntity<ApiErrorResponse> saccoAdminRequired = requireSaccoAdministratorForUserManagement(currentSession);
        if (saccoAdminRequired != null) return saccoAdminRequired;

        User targetUser = userRepository.findById(userId).orElse(null);
        if (targetUser == null || "deleted".equalsIgnoreCase(targetUser.getStatus())) {
            return userNotFound();
        }
        if (!canAccessUser(currentSession, targetUser)) return tenantAccessDenied();
        if (!canManagePlatformUser(currentSession, targetUser)) {
            return platformSuperAdminRequired("update platform users");
        }
        String status = normalizedStatus(request.status());
        if (status == null || "deleted".equals(status)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_STATUS", "Status must be active or suspended."));
        }
        if (targetUser.getId().equals(currentSession.user().getId()) && !"active".equals(status)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "CANNOT_DISABLE_SELF", "You cannot disable your own active administrator account."));
        }

        targetUser.changeStatus(status);
        User savedUser = userRepository.save(targetUser);
        auditService.record(
                targetUser.getTenantId(),
                currentSession.user(),
                "Changed user status to " + status + " for " + savedUser.getEmail(),
                "user",
                savedUser.getId(),
                httpRequest.getRemoteAddr());

        return ResponseEntity.ok(ApiResponse.of(UserResponse.from(savedUser)));
    }

    @DeleteMapping("/{userId}")
    ResponseEntity<?> deleteUser(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String userId,
            HttpServletRequest httpRequest) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "users:create")) {
            return authService.permissionRequired("users:create");
        }
        ResponseEntity<ApiErrorResponse> saccoAdminRequired = requireSaccoAdministratorForUserManagement(currentSession);
        if (saccoAdminRequired != null) return saccoAdminRequired;

        User targetUser = userRepository.findById(userId).orElse(null);
        if (targetUser == null || "deleted".equalsIgnoreCase(targetUser.getStatus())) {
            return userNotFound();
        }
        if (!canAccessUser(currentSession, targetUser)) return tenantAccessDenied();
        if (!canManagePlatformUser(currentSession, targetUser)) {
            return platformSuperAdminRequired("delete platform users");
        }
        if (targetUser.getId().equals(currentSession.user().getId())) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "CANNOT_DELETE_SELF", "You cannot delete your own administrator account."));
        }

        targetUser.changeStatus("deleted");
        User savedUser = userRepository.save(targetUser);
        auditService.record(
                targetUser.getTenantId(),
                currentSession.user(),
                "Deleted user " + savedUser.getEmail(),
                "user",
                savedUser.getId(),
                httpRequest.getRemoteAddr());

        return ResponseEntity.ok(ApiResponse.of(UserResponse.from(savedUser)));
    }

    @GetMapping("/{userId}/roles")
    ResponseEntity<?> listUserRoles(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String userId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "users:view")) {
            return authService.permissionRequired("users:view");
        }

        User targetUser = userRepository.findById(userId).orElse(null);
        if (targetUser == null || "deleted".equalsIgnoreCase(targetUser.getStatus())) {
            return userNotFound();
        }
        if (!canAccessUser(currentSession, targetUser)) return tenantAccessDenied();
        if (targetUser.getTenantId().equals("tenant_platform")
                && !hasRole(currentSession.user(), "Platform Admin")
                && !hasRole(currentSession.user(), "Platform Super Admin")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "PLATFORM_SUPER_ADMIN_REQUIRED", "Only the Platform Super Admin can update platform user roles."));
        }

        return ResponseEntity.ok(ApiResponse.of(assignmentResponse(targetUser)));
    }

    @PutMapping("/{userId}/roles")
    @Transactional
    ResponseEntity<?> replaceUserRoles(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String userId,
            @Valid @RequestBody ReplaceUserRolesRequest request,
            HttpServletRequest httpRequest) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "users:create")) {
            return authService.permissionRequired("users:create");
        }
        ResponseEntity<ApiErrorResponse> saccoAdminRequired = requireSaccoAdministratorForUserManagement(currentSession);
        if (saccoAdminRequired != null) return saccoAdminRequired;

        User targetUser = userRepository.findById(userId).orElse(null);
        if (targetUser == null || "deleted".equalsIgnoreCase(targetUser.getStatus())) {
            return userNotFound();
        }
        if (!canAccessUser(currentSession, targetUser)) return tenantAccessDenied();

        List<String> roleIds = sanitizedRoleIds(request.roleIds());
        if (roleIds.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "ROLE_REQUIRED", "Assign at least one role to the user."));
        }

        List<Role> roles = roleRepository.findAllById(roleIds);
        Set<String> knownRoleIds = roles.stream().map(Role::getId).collect(Collectors.toSet());
        List<String> unknownRoleIds = roleIds.stream()
                .filter(roleId -> !knownRoleIds.contains(roleId))
                .toList();
        if (!unknownRoleIds.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "UNKNOWN_ROLE", "One or more roles are unknown."));
        }
        boolean hasCrossTenantRole = roles.stream().anyMatch(role -> !role.getTenantId().equals(targetUser.getTenantId()));
        if (hasCrossTenantRole) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "ROLE_TENANT_MISMATCH", "Roles must belong to the same tenant as the user."));
        }

        userRoleRepository.deleteByIdUserId(targetUser.getId());
        userRoleRepository.saveAll(roleIds.stream()
                .map(roleId -> new UserRole(targetUser.getId(), roleId, targetUser.getTenantId()))
                .toList());
        auditService.record(
                targetUser.getTenantId(),
                currentSession.user(),
                "Updated roles for user " + targetUser.getEmail(),
                "user",
                targetUser.getId(),
                httpRequest.getRemoteAddr());

        return ResponseEntity.ok(ApiResponse.of(new UserRoleAssignmentResponse(targetUser.getId(), targetUser.getTenantId(), roleIds)));
    }

    @PostMapping("/{userId}/sessions/revoke")
    ResponseEntity<?> revokeUserSessions(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String userId,
            HttpServletRequest httpRequest) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "users:create")) {
            return authService.permissionRequired("users:create");
        }
        ResponseEntity<ApiErrorResponse> saccoAdminRequired = requireSaccoAdministratorForUserManagement(currentSession);
        if (saccoAdminRequired != null) return saccoAdminRequired;

        User targetUser = userRepository.findById(userId).orElse(null);
        if (targetUser == null || "deleted".equalsIgnoreCase(targetUser.getStatus())) {
            return userNotFound();
        }
        if (!canAccessUser(currentSession, targetUser)) return tenantAccessDenied();
        if (!canManagePlatformUser(currentSession, targetUser)) {
            return platformSuperAdminRequired("force logout platform users");
        }
        if (targetUser.getId().equals(currentSession.user().getId())) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "CANNOT_FORCE_LOGOUT_SELF", "Use Logout to end your own current session."));
        }

        Instant now = Instant.now();
        List<AuthSession> sessions = authSessionRepository.findByUserIdAndRevokedAtIsNull(targetUser.getId()).stream()
                .filter(session -> session.getExpiresAt().isAfter(now))
                .toList();
        sessions.forEach(AuthSession::revoke);
        authSessionRepository.saveAll(sessions);

        auditService.record(
                targetUser.getTenantId(),
                currentSession.user(),
                "Force logged out " + targetUser.getEmail() + " from " + sessions.size() + " active session(s)",
                "auth_session",
                targetUser.getId(),
                httpRequest.getRemoteAddr());

        return ResponseEntity.ok(ApiResponse.of(new SessionRevocationResponse(targetUser.getId(), sessions.size())));
    }

    @PatchMapping("/{userId}/mfa")
    ResponseEntity<?> updateUserMfa(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String userId,
            @Valid @RequestBody UpdateUserMfaRequest request,
            HttpServletRequest httpRequest) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "users:create")) {
            return authService.permissionRequired("users:create");
        }
        ResponseEntity<ApiErrorResponse> saccoAdminRequired = requireSaccoAdministratorForUserManagement(currentSession);
        if (saccoAdminRequired != null) return saccoAdminRequired;

        User targetUser = userRepository.findById(userId).orElse(null);
        if (targetUser == null || "deleted".equalsIgnoreCase(targetUser.getStatus())) {
            return userNotFound();
        }
        if (!canAccessUser(currentSession, targetUser)) return tenantAccessDenied();
        if (!canManagePlatformUser(currentSession, targetUser)) {
            return platformSuperAdminRequired("update platform user MFA");
        }

        if (request.enabled()) {
            targetUser.enableMfa();
        } else {
            targetUser.disableMfa();
        }
        User savedUser = userRepository.save(targetUser);
        auditService.record(
                targetUser.getTenantId(),
                currentSession.user(),
                (request.enabled() ? "Enabled" : "Disabled") + " MFA for user " + savedUser.getEmail(),
                "mfa",
                savedUser.getId(),
                httpRequest.getRemoteAddr());

        return ResponseEntity.ok(ApiResponse.of(UserResponse.from(savedUser, activeSessionCount(savedUser.getId(), Instant.now()))));
    }

    @PostMapping("/{userId}/password-reset")
    ResponseEntity<?> requestUserPasswordReset(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String userId,
            HttpServletRequest httpRequest) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "users:create")) {
            return authService.permissionRequired("users:create");
        }
        ResponseEntity<ApiErrorResponse> saccoAdminRequired = requireSaccoAdministratorForUserManagement(currentSession);
        if (saccoAdminRequired != null) return saccoAdminRequired;

        User targetUser = userRepository.findById(userId).orElse(null);
        if (targetUser == null || "deleted".equalsIgnoreCase(targetUser.getStatus())) {
            return userNotFound();
        }
        if (!canAccessUser(currentSession, targetUser)) return tenantAccessDenied();
        if (!canManagePlatformUser(currentSession, targetUser)) {
            return platformSuperAdminRequired("request platform user password reset");
        }

        String resetToken = tokenGenerator.createToken();
        Instant expiresAt = Instant.now().plus(Duration.ofMinutes(30));
        PasswordResetRequest resetRequest = passwordResetRequestRepository.save(new PasswordResetRequest(
                "reset_" + UUID.randomUUID(),
                targetUser.getTenantId(),
                targetUser.getId(),
                tokenGenerator.hashToken(resetToken),
                expiresAt));
        targetUser.requirePasswordReset();
        userRepository.save(targetUser);
        auditService.record(
                targetUser.getTenantId(),
                currentSession.user(),
                "Requested password reset for user " + targetUser.getEmail(),
                "password_reset",
                resetRequest.getId(),
                httpRequest.getRemoteAddr());

        String responseToken = demoCredentialPolicy.demoLoginsEnabled() ? resetToken : null;
        return ResponseEntity.ok(ApiResponse.of(new UserPasswordResetResponse(
                targetUser.getId(),
                resetRequest.getId(),
                expiresAt,
                responseToken)));
    }

    @GetMapping("/{userId}/password-resets")
    ResponseEntity<?> listUserPasswordResets(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String userId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "users:create")) {
            return authService.permissionRequired("users:create");
        }
        ResponseEntity<ApiErrorResponse> saccoAdminRequired = requireSaccoAdministratorForUserManagement(currentSession);
        if (saccoAdminRequired != null) return saccoAdminRequired;

        User targetUser = userRepository.findById(userId).orElse(null);
        if (targetUser == null || "deleted".equalsIgnoreCase(targetUser.getStatus())) {
            return userNotFound();
        }
        if (!canAccessUser(currentSession, targetUser)) return tenantAccessDenied();
        if (!canManagePlatformUser(currentSession, targetUser)) {
            return platformSuperAdminRequired("view platform user password reset history");
        }

        return ResponseEntity.ok(ApiResponse.of(passwordResetRequestRepository.findByUserIdOrderByCreatedAtDesc(targetUser.getId()).stream()
                .limit(10)
                .map(PasswordResetSummaryResponse::from)
                .toList()));
    }

    @GetMapping("/{userId}/sessions")
    ResponseEntity<?> listUserSessions(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String userId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "users:create")) {
            return authService.permissionRequired("users:create");
        }
        ResponseEntity<ApiErrorResponse> saccoAdminRequired = requireSaccoAdministratorForUserManagement(currentSession);
        if (saccoAdminRequired != null) return saccoAdminRequired;

        User targetUser = userRepository.findById(userId).orElse(null);
        if (targetUser == null || "deleted".equalsIgnoreCase(targetUser.getStatus())) {
            return userNotFound();
        }
        if (!canAccessUser(currentSession, targetUser)) return tenantAccessDenied();
        if (!canManagePlatformUser(currentSession, targetUser)) {
            return platformSuperAdminRequired("view platform user sessions");
        }

        Instant now = Instant.now();
        List<SessionDetailResponse> sessions = authSessionRepository.findByUserIdAndRevokedAtIsNull(targetUser.getId()).stream()
                .filter(session -> session.getExpiresAt().isAfter(now))
                .map(SessionDetailResponse::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.of(sessions));
    }

    @PostMapping("/{userId}/sessions/{sessionId}/revoke")
    ResponseEntity<?> revokeUserSession(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String userId,
            @PathVariable String sessionId,
            HttpServletRequest httpRequest) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "users:create")) {
            return authService.permissionRequired("users:create");
        }

        User targetUser = userRepository.findById(userId).orElse(null);
        if (targetUser == null || "deleted".equalsIgnoreCase(targetUser.getStatus())) {
            return userNotFound();
        }
        if (!canAccessUser(currentSession, targetUser)) return tenantAccessDenied();
        if (!canManagePlatformUser(currentSession, targetUser)) {
            return platformSuperAdminRequired("revoke platform user sessions");
        }
        if (targetUser.getId().equals(currentSession.user().getId())) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "CANNOT_FORCE_LOGOUT_SELF", "Use Logout to end your own current session."));
        }

        AuthSession session = authSessionRepository.findById(sessionId).orElse(null);
        if (session == null || !targetUser.getId().equals(session.getUserId()) || !session.getExpiresAt().isAfter(Instant.now())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "SESSION_NOT_FOUND", "Active session was not found."));
        }
        session.revoke();
        authSessionRepository.save(session);

        auditService.record(
                targetUser.getTenantId(),
                currentSession.user(),
                "Revoked staff session " + session.getId() + " for " + targetUser.getEmail(),
                "auth_session",
                session.getId(),
                httpRequest.getRemoteAddr());

        return ResponseEntity.ok(ApiResponse.of(new SessionRevocationResponse(targetUser.getId(), 1)));
    }

    private UserRoleAssignmentResponse assignmentResponse(User user) {
        List<String> roleIds = userRoleRepository.findByIdUserId(user.getId()).stream()
                .map(userRole -> userRole.getId().getRoleId())
                .sorted()
                .toList();
        return new UserRoleAssignmentResponse(user.getId(), user.getTenantId(), roleIds);
    }

    private List<String> sanitizedRoleIds(List<String> roleIds) {
        if (roleIds == null) return List.of();
        List<String> sanitized = new ArrayList<>();
        for (String roleId : roleIds) {
            if (roleId != null && !roleId.isBlank()) {
                String value = roleId.trim();
                if (!sanitized.contains(value)) sanitized.add(value);
            }
        }
        return sanitized;
    }

    private boolean canAccessUser(AuthService.CurrentSession currentSession, User targetUser) {
        return authService.isPlatform(currentSession.user()) || targetUser.getTenantId().equals(currentSession.user().getTenantId());
    }

    private boolean canManagePlatformUser(AuthService.CurrentSession currentSession, User targetUser) {
        return !targetUser.getTenantId().equals("tenant_platform")
                || hasRole(currentSession.user(), "Platform Admin")
                || hasRole(currentSession.user(), "Platform Super Admin");
    }

    private ResponseEntity<ApiErrorResponse> requireSaccoAdministratorForUserManagement(AuthService.CurrentSession currentSession) {
        // The Chairperson is the SACCO administrator, so the Chairperson role (and the merged
        // "SACCO Administrator / Chairperson" name) can manage staff alongside a legacy SACCO Administrator.
        if (authService.isPlatform(currentSession.user())
                || hasRole(currentSession.user(), "SACCO Administrator")
                || hasRole(currentSession.user(), "Chairperson")
                || hasRole(currentSession.user(), "SACCO Administrator / Chairperson")) {
            return null;
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "SACCO_ADMIN_REQUIRED", "Only the SACCO Administrator (Chairperson) can manage SACCO staff access."));
    }

    private long activeSessionCount(String userId, Instant now) {
        return authSessionRepository.findByUserIdAndRevokedAtIsNull(userId).stream()
                .filter(session -> session.getExpiresAt().isAfter(now))
                .count();
    }

    private String normalizedStatus(String status) {
        if (status == null) return null;
        String value = status.trim().toLowerCase();
        return switch (value) {
            case "active", "suspended", "deleted" -> value;
            default -> null;
        };
    }

    private boolean hasRole(User user, String roleName) {
        List<String> roleIds = userRoleRepository.findByIdUserId(user.getId()).stream()
                .map(userRole -> userRole.getId().getRoleId())
                .toList();
        if (roleIds.isEmpty()) return false;
        return roleRepository.findAllById(roleIds).stream()
                .anyMatch(role -> role.getName().equalsIgnoreCase(roleName));
    }

    private ResponseEntity<ApiErrorResponse> tenantAccessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access users for another tenant."));
    }

    private ResponseEntity<ApiErrorResponse> userNotFound() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiErrorResponse.of(404, "USER_NOT_FOUND", "User was not found."));
    }

    private ResponseEntity<ApiErrorResponse> platformSuperAdminRequired(String action) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "PLATFORM_SUPER_ADMIN_REQUIRED", "Only the Platform Super Admin can " + action + "."));
    }

    record CreateUserRequest(
            String tenantId,
            @NotBlank String fullName,
            @Email String email,
            String phone,
            String deliveryChannel,
            String password) {
    }

    record OfficialStaffAccessRequest(@NotBlank String memberId, @NotBlank String office) {
    }

    record OfficialStaffAccessResponse(String memberId, String userId, String office, String email, boolean linked) {
    }

    private String normalizeOfficialOffice(String office) {
        String normalized = office == null ? "" : office.trim().toLowerCase();
        if ("chairman".equals(normalized)) return SaccoOfficialAssignment.CHAIRPERSON;
        if (Set.of(SaccoOfficialAssignment.CHAIRPERSON, SaccoOfficialAssignment.SECRETARY, SaccoOfficialAssignment.TREASURER).contains(normalized)) return normalized;
        return null;
    }

    record UpdateUserRequest(
            @NotBlank String fullName,
            @Email @NotBlank String email,
            String phone) {
    }

    record UpdateUserStatusRequest(@NotBlank String status) {
    }

    record ReplaceUserRolesRequest(List<String> roleIds) {
    }

    record UpdateUserMfaRequest(boolean enabled) {
    }

    record UserRoleAssignmentResponse(String userId, String tenantId, List<String> roleIds) {
    }

    record SessionRevocationResponse(String userId, int revokedSessions) {
    }

    record UserPasswordResetResponse(String userId, String resetRequestId, Instant expiresAt, String resetToken) {
    }

    record PasswordResetSummaryResponse(String id, String status, Instant createdAt, Instant expiresAt, Instant usedAt) {
        static PasswordResetSummaryResponse from(PasswordResetRequest request) {
            return new PasswordResetSummaryResponse(
                    request.getId(),
                    request.getStatus(),
                    request.getCreatedAt(),
                    request.getExpiresAt(),
                    request.getUsedAt());
        }
    }

    record SessionDetailResponse(String id, String ipAddress, String userAgent, Instant createdAt, Instant expiresAt) {
        static SessionDetailResponse from(AuthSession session) {
            return new SessionDetailResponse(
                    session.getId(),
                    session.getIpAddress(),
                    session.getUserAgent(),
                    session.getCreatedAt(),
                    session.getExpiresAt());
        }
    }
}
