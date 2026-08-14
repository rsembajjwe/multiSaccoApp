package com.methaltech.sacco.identity;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.methaltech.sacco.security.TokenGenerator;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class AuthServiceUnitTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final AuthSessionRepository authSessionRepository = mock(AuthSessionRepository.class);
    private final TokenGenerator tokenGenerator = mock(TokenGenerator.class);
    private final UserRoleRepository userRoleRepository = mock(UserRoleRepository.class);
    private final RolePermissionRepository rolePermissionRepository = mock(RolePermissionRepository.class);
    private final AuthService service = new AuthService(
            userRepository,
            authSessionRepository,
            tokenGenerator,
            userRoleRepository,
            rolePermissionRepository);

    @Test
    void currentSessionRequiresUsableBearerToken() {
        assertNull(service.currentSession(null));
        assertNull(service.currentSession("Basic abc"));
        assertNull(service.currentSession("Bearer   "));
    }

    @Test
    void currentSessionReturnsActiveUserForValidUnrevokedSession() {
        User user = new User("user_1", "tenant_green", "Treasurer", "treasurer@example.test", null, "hash", "salt", "active");
        AuthSession session = new AuthSession("session_1", user.getId(), user.getTenantId(), "hash_token", Instant.now().plusSeconds(60));
        when(tokenGenerator.hashToken("plain-token")).thenReturn("hash_token");
        when(authSessionRepository.findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(eq("hash_token"), any(Instant.class)))
                .thenReturn(Optional.of(session));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        AuthService.CurrentSession current = service.currentSession("Bearer plain-token");

        assertSame(user, current.user());
        assertSame(session, current.session());
        verify(tokenGenerator).hashToken("plain-token");
    }

    @Test
    void currentSessionRejectsSuspendedUsersEvenWhenTokenExists() {
        User user = new User("user_1", "tenant_green", "Treasurer", "treasurer@example.test", null, "hash", "salt", "suspended");
        AuthSession session = new AuthSession("session_1", user.getId(), user.getTenantId(), "hash_token", Instant.now().plusSeconds(60));
        when(tokenGenerator.hashToken("plain-token")).thenReturn("hash_token");
        when(authSessionRepository.findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(eq("hash_token"), any(Instant.class)))
                .thenReturn(Optional.of(session));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        assertNull(service.currentSession("Bearer plain-token"));
    }

    @Test
    void hasPermissionRequiresAssignedRoleWithMatchingPermission() {
        User user = new User("user_1", "tenant_platform", "Billing", "billing@example.test", null, "hash", "salt", "active");
        when(userRoleRepository.findByIdUserIdAndTenantId(user.getId(), user.getTenantId()))
                .thenReturn(List.of(
                        new UserRole(user.getId(), "platform_billing", user.getTenantId()),
                        new UserRole(user.getId(), "platform_support", user.getTenantId())));
        when(rolePermissionRepository.findByIdRoleIdIn(List.of("platform_billing", "platform_support")))
                .thenReturn(List.of(
                        new RolePermission("platform_billing", "subscriptions.manage"),
                        new RolePermission("platform_support", "complaints.view")));

        assertTrue(service.hasPermission(user, "subscriptions.manage"));
        assertTrue(service.hasPermission(user, "complaints.view"));
        assertFalse(service.hasPermission(user, "platform.users.manage"));
    }

    @Test
    void hasPermissionIgnoresRolesOutsideUsersTenant() {
        User user = new User("user_1", "tenant_green", "Treasurer", "treasurer@example.test", null, "hash", "salt", "active");
        when(userRoleRepository.findByIdUserIdAndTenantId(user.getId(), user.getTenantId()))
                .thenReturn(List.of());
        when(userRoleRepository.findByIdUserId(user.getId()))
                .thenReturn(List.of(new UserRole(user.getId(), "role_lake_treasurer", "tenant_lake")));
        when(rolePermissionRepository.findByIdRoleIdIn(List.of("role_lake_treasurer")))
                .thenReturn(List.of(new RolePermission("role_lake_treasurer", "transactions.approve")));

        assertFalse(service.hasPermission(user, "transactions.approve"));
        verify(rolePermissionRepository, never()).findByIdRoleIdIn(List.of("role_lake_treasurer"));
    }

    @Test
    void hasPermissionFailsClosedForMissingInputsOrMissingRoles() {
        User user = new User("user_1", "tenant_platform", "Support", "support@example.test", null, "hash", "salt", "active");
        when(userRoleRepository.findByIdUserIdAndTenantId(user.getId(), user.getTenantId())).thenReturn(List.of());

        assertFalse(service.hasPermission(null, "reports.view"));
        assertFalse(service.hasPermission(user, null));
        assertFalse(service.hasPermission(user, " "));
        assertFalse(service.hasPermission(user, "reports.view"));
    }

    @Test
    void platformUsersAreSeparatedFromSaccoUsersByPlatformTenant() {
        User platformUser = new User("platform_user", "tenant_platform", "Admin", "admin@example.test", null, "hash", "salt", "active");
        User saccoUser = new User("sacco_user", "tenant_green", "Chairperson", "chair@example.test", null, "hash", "salt", "active");

        assertTrue(service.isPlatform(platformUser));
        assertFalse(service.isPlatform(saccoUser));
    }
}
