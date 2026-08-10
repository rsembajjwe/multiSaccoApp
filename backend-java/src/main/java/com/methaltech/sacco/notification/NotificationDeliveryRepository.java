package com.methaltech.sacco.notification;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

interface NotificationDeliveryRepository extends JpaRepository<NotificationDelivery, String> {
    List<NotificationDelivery> findAllByOrderByTenantIdAscCreatedAtDesc();
    List<NotificationDelivery> findByTenantIdOrderByCreatedAtDesc(String tenantId);
    Page<NotificationDelivery> findByTenantId(String tenantId, Pageable pageable);
}
