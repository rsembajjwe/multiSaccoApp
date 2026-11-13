package com.methaltech.sacco.identity;

import com.methaltech.sacco.notification.OnboardingNotificationService;
import com.methaltech.sacco.security.PasswordHasher;
import com.methaltech.sacco.tenant.TenantResponse;
import com.methaltech.sacco.tenant.TenantService;
import java.security.SecureRandom;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class StaffOnboardingService {

    private static final char[] UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ".toCharArray();
    private static final char[] LOWER = "abcdefghijkmnopqrstuvwxyz".toCharArray();
    private static final char[] DIGITS = "23456789".toCharArray();
    private static final char[] SYMBOLS = "!@#$%&*?".toCharArray();
    private static final char[] ALL = (new String(UPPER) + new String(LOWER) + new String(DIGITS) + new String(SYMBOLS)).toCharArray();

    private final SecureRandom secureRandom = new SecureRandom();
    private final UserRepository userRepository;
    private final PasswordHasher passwordHasher;
    private final OnboardingNotificationService notificationService;
    private final TenantService tenantService;

    StaffOnboardingService(
            UserRepository userRepository,
            PasswordHasher passwordHasher,
            OnboardingNotificationService notificationService,
            TenantService tenantService) {
        this.userRepository = userRepository;
        this.passwordHasher = passwordHasher;
        this.notificationService = notificationService;
        this.tenantService = tenantService;
    }

    @Transactional
    User createUser(
            String tenantId,
            String fullName,
            String email,
            String phone,
            String channel) {
        String temporaryPassword = temporaryPassword();
        PasswordHasher.PasswordHash password = passwordHasher.hash(temporaryPassword);
        User user = new User(
                "user_" + UUID.randomUUID(),
                tenantId,
                fullName,
                email,
                phone,
                password.hash(),
                password.salt(),
                "active");
        user.beginOnboarding(channel);
        userRepository.save(user);
        String recipient = user.onboardingRecipient();
        sendTemporaryPassword(user, channel, recipient, temporaryPassword);
        user.markOnboardingSent();
        return userRepository.save(user);
    }

    @Transactional
    User createDemoUser(
            String tenantId,
            String fullName,
            String email,
            String phone,
            String passwordValue) {
        PasswordHasher.PasswordHash password = passwordHasher.hash(passwordValue);
        return userRepository.save(new User(
                "user_" + UUID.randomUUID(),
                tenantId,
                fullName,
                email,
                phone,
                password.hash(),
                password.salt(),
                "active"));
    }

    @Transactional
    User reissueTemporaryPassword(User user, String channel) {
        String temporaryPassword = temporaryPassword();
        PasswordHasher.PasswordHash password = passwordHasher.hash(temporaryPassword);
        user.setTemporaryPassword(password.hash(), password.salt(), channel);
        userRepository.save(user);
        sendTemporaryPassword(user, channel, user.onboardingRecipient(), temporaryPassword);
        user.markOnboardingSent();
        return userRepository.save(user);
    }

    private String temporaryPassword() {
        char[] password = new char[16];
        password[0] = random(UPPER);
        password[1] = random(LOWER);
        password[2] = random(DIGITS);
        password[3] = random(SYMBOLS);
        for (int index = 4; index < password.length; index++) {
            password[index] = random(ALL);
        }
        for (int index = password.length - 1; index > 0; index--) {
            int swapIndex = secureRandom.nextInt(index + 1);
            char value = password[index];
            password[index] = password[swapIndex];
            password[swapIndex] = value;
        }
        return new String(password);
    }

    private void sendTemporaryPassword(User user, String channel, String recipient, String temporaryPassword) {
        TenantResponse tenant = tenantService.findById(user.getTenantId())
                .orElseThrow(() -> new IllegalStateException("User tenant was not found."));
        notificationService.sendTemporaryPassword(
                channel,
                recipient,
                user.getFullName(),
                tenant.name(),
                tenant.abbreviation(),
                temporaryPassword);
    }

    private char random(char[] values) {
        return values[secureRandom.nextInt(values.length)];
    }
}
