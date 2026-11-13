package com.methaltech.sacco.notification;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class PushDeviceRegistrationService {
    private final PushDeviceRegistrationRepository repository;

    PushDeviceRegistrationService(PushDeviceRegistrationRepository repository) {
        this.repository = repository;
    }

    @Transactional
    void register(String tenantId, String ownerType, String ownerId, String token, String platform) {
        PushDeviceRegistration registration = repository.findByDeviceToken(token)
                .orElseGet(() -> new PushDeviceRegistration(
                        "push_device_" + UUID.randomUUID(), tenantId, ownerType, ownerId, token, platform));
        registration.assignTo(tenantId, ownerType, ownerId, platform);
        repository.save(registration);
    }

    @Transactional
    void unregister(String ownerType, String ownerId, String token) {
        repository.deleteByDeviceTokenAndOwnerTypeAndOwnerId(token, ownerType, ownerId);
    }

    List<String> memberTokens(String tenantId, String memberId) {
        return repository.findByTenantIdAndOwnerTypeAndOwnerId(tenantId, "member", memberId).stream()
                .map(PushDeviceRegistration::getDeviceToken).toList();
    }

    List<String> staffTokens(String tenantId) {
        return repository.findByTenantIdAndOwnerType(tenantId, "staff").stream()
                .map(PushDeviceRegistration::getDeviceToken).distinct().toList();
    }
}
