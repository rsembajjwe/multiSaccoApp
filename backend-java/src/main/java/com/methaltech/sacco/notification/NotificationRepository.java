package com.methaltech.sacco.notification;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, String> {
    List<Notification> findByMemberIdOrderByCreatedAtDesc(String memberId);
}
