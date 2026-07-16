package com.methaltech.sacco.notification;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface NotificationDeliveryRepository extends JpaRepository<NotificationDelivery, String> {
    List<NotificationDelivery> findAllByOrderByTenantIdAscCreatedAtDesc();
    List<NotificationDelivery> findByTenantIdOrderByCreatedAtDesc(String tenantId);
}
