package com.methaltech.sacco.notification;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface NotificationTemplateRepository extends JpaRepository<NotificationTemplate, String> {
    List<NotificationTemplate> findAllByOrderByTenantIdAscEventTypeAscChannelAsc();
    Optional<NotificationTemplate> findFirstByTenantIdAndEventTypeAndStatusOrderByUpdatedAtDesc(String tenantId, String eventType, String status);
    Optional<NotificationTemplate> findFirstByTenantIdIsNullAndEventTypeAndStatusOrderByUpdatedAtDesc(String eventType, String status);
}
