package com.methaltech.sacco.notification;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface PushDeviceRegistrationRepository extends JpaRepository<PushDeviceRegistration, String> {
    Optional<PushDeviceRegistration> findByDeviceToken(String deviceToken);
    List<PushDeviceRegistration> findByTenantIdAndOwnerTypeAndOwnerId(
            String tenantId, String ownerType, String ownerId);
    List<PushDeviceRegistration> findByTenantIdAndOwnerType(String tenantId, String ownerType);
    long deleteByDeviceTokenAndOwnerTypeAndOwnerId(String deviceToken, String ownerType, String ownerId);
}
