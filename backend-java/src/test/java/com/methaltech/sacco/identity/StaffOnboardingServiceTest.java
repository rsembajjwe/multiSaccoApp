package com.methaltech.sacco.identity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.methaltech.sacco.notification.OnboardingNotificationService;
import com.methaltech.sacco.security.PasswordHasher;
import com.methaltech.sacco.tenant.TenantResponse;
import com.methaltech.sacco.tenant.TenantService;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class StaffOnboardingServiceTest {

    @Test
    void createsForcedResetUserAndDeliversGeneratedPassword() {
        UserRepository userRepository = mock(UserRepository.class);
        OnboardingNotificationService notificationService = mock(OnboardingNotificationService.class);
        TenantService tenantService = mock(TenantService.class);
        when(userRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(tenantService.findById("tenant_green")).thenReturn(Optional.of(new TenantResponse(
                "tenant_green", "A-Z Community Group", "GREE", "active", "REG", "Kampala",
                "Uganda", "en-UG", "UGX", 0, LocalDate.now(), "starter", 100, "NONE",
                false, false, false, false, null, null, null, null)));
        PasswordHasher passwordHasher = new PasswordHasher();
        StaffOnboardingService service = new StaffOnboardingService(
                userRepository,
                passwordHasher,
                notificationService,
                tenantService);

        User user = service.createUser(
                "tenant_green",
                "New Treasurer",
                "treasurer@example.com",
                "",
                "email");

        ArgumentCaptor<String> temporaryPassword = ArgumentCaptor.forClass(String.class);
        verify(notificationService).sendTemporaryPassword(
                eq("email"),
                eq("treasurer@example.com"),
                eq("New Treasurer"),
                eq("A-Z Community Group"),
                eq("GREE"),
                temporaryPassword.capture());
        assertTrue(passwordHasher.matches(
                temporaryPassword.getValue(),
                user.getPasswordSalt(),
                user.getPasswordHash()));
        assertTrue(user.isPasswordResetRequired());
        assertEquals("email", user.getOnboardingChannel());
        assertEquals("sent", user.getOnboardingDeliveryStatus());
        assertFalse(user.isEmailVerified());
    }

    @Test
    void completingFirstLoginVerifiesOnlySelectedContact() {
        User user = new User(
                "user_one", "tenant_green", "SMS User", null, "+256700000001",
                "hash", "salt", "active");
        user.beginOnboarding("sms");
        user.markOnboardingSent();

        user.verifyOnboardingContact();
        user.changePassword("new-hash", "new-salt");

        assertTrue(user.isPhoneVerified());
        assertFalse(user.isEmailVerified());
        assertFalse(user.isPasswordResetRequired());
    }

    @Test
    void reissueReplacesTemporaryPasswordAndUsesRequestedChannel() {
        UserRepository userRepository = mock(UserRepository.class);
        OnboardingNotificationService notificationService = mock(OnboardingNotificationService.class);
        TenantService tenantService = mock(TenantService.class);
        when(userRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(tenantService.findById("tenant_green")).thenReturn(Optional.of(new TenantResponse(
                "tenant_green", "A-Z Community Group", "GREE", "active", "REG", "Kampala",
                "Uganda", "en-UG", "UGX", 0, LocalDate.now(), "starter", 100, "NONE",
                false, false, false, false, null, null, null, null)));
        PasswordHasher passwordHasher = new PasswordHasher();
        StaffOnboardingService service = new StaffOnboardingService(
                userRepository, passwordHasher, notificationService, tenantService);
        User user = new User(
                "user_one", "tenant_green", "Treasurer", "treasurer@example.com", "+256700000001",
                "old-hash", "old-salt", "active");
        user.beginOnboarding("email");

        service.reissueTemporaryPassword(user, "sms");

        ArgumentCaptor<String> temporaryPassword = ArgumentCaptor.forClass(String.class);
        verify(notificationService).sendTemporaryPassword(
                eq("sms"), eq("+256700000001"), eq("Treasurer"),
                eq("A-Z Community Group"), eq("GREE"), temporaryPassword.capture());
        assertTrue(passwordHasher.matches(
                temporaryPassword.getValue(), user.getPasswordSalt(), user.getPasswordHash()));
        assertEquals("sms", user.getOnboardingChannel());
        assertEquals("sent", user.getOnboardingDeliveryStatus());
    }
}
