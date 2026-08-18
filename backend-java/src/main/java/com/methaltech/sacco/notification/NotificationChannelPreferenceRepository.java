package com.methaltech.sacco.notification;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationChannelPreferenceRepository extends JpaRepository<NotificationChannelPreference, String> {

    List<NotificationChannelPreference> findByTenantIdAndMemberId(String tenantId, String memberId);

    Optional<NotificationChannelPreference> findByTenantIdAndMemberIdAndChannel(String tenantId, String memberId, String channel);
}
