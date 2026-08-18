package com.methaltech.sacco.notification;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, String> {
    List<Notification> findByMemberIdOrderByCreatedAtDesc(String memberId);

    List<Notification> findByTenantIdOrderByCreatedAtDesc(String tenantId);

    List<Notification> findAllByOrderByTenantIdAscCreatedAtDesc();

    Page<Notification> findByTenantId(String tenantId, Pageable pageable);
}
