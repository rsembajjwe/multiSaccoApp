package com.methaltech.sacco.notification;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Resolves and edits notification channel preferences. A delivery on a gateable channel (SMS, email,
 * WhatsApp, push) happens only when the SACCO enables the channel AND the member has not opted out.
 * The in-app channel is always on. Absence of a stored row means the channel is enabled, so behaviour is
 * unchanged until a setting is edited.
 */
@Service
@RequiredArgsConstructor
public class NotificationChannelPreferenceService {

    /** Channels whose fan-out can be toggled. in_app is intentionally excluded (always on). */
    public static final List<String> GATEABLE_CHANNELS = List.of("sms", "email", "whatsapp", "push");

    private final NotificationChannelPreferenceRepository repository;

    /** Whether a message may be delivered to this member on this channel. */
    public boolean channelAllowed(String tenantId, String memberId, String channel) {
        if (channel == null || "in_app".equals(channel)) {
            return true;
        }
        if (!saccoChannelEnabled(tenantId, channel)) {
            return false;
        }
        if (memberId == null || memberId.isBlank()) {
            return true;
        }
        return repository.findByTenantIdAndMemberIdAndChannel(tenantId, memberId, channel)
                .map(NotificationChannelPreference::isEnabled)
                .orElse(true);
    }

    /**
     * The set of gateable channels a member may receive on, resolved in exactly two queries (SACCO
     * toggles + member overrides). Use this in fan-out to avoid a per-channel query storm — a broadcast
     * to many members would otherwise issue members x channels x 2 preference queries.
     */
    public Set<String> allowedChannels(String tenantId, String memberId) {
        Map<String, Boolean> sacco = rowMap(repository.findByTenantIdAndMemberId(tenantId, NotificationChannelPreference.SACCO_LEVEL));
        Map<String, Boolean> member = (memberId == null || memberId.isBlank())
                ? Map.of()
                : rowMap(repository.findByTenantIdAndMemberId(tenantId, memberId));
        Set<String> allowed = new LinkedHashSet<>();
        for (String channel : GATEABLE_CHANNELS) {
            if (sacco.getOrDefault(channel, true) && member.getOrDefault(channel, true)) {
                allowed.add(channel);
            }
        }
        return allowed;
    }

    /** Whether the SACCO offers this channel at all. */
    public boolean saccoChannelEnabled(String tenantId, String channel) {
        if (channel == null || "in_app".equals(channel)) {
            return true;
        }
        return repository.findByTenantIdAndMemberIdAndChannel(tenantId, NotificationChannelPreference.SACCO_LEVEL, channel)
                .map(NotificationChannelPreference::isEnabled)
                .orElse(true);
    }

    /** SACCO-wide channel map: channel -> enabled (defaults to true when unset). */
    public Map<String, Boolean> saccoChannels(String tenantId) {
        return effectiveMap(repository.findByTenantIdAndMemberId(tenantId, NotificationChannelPreference.SACCO_LEVEL), key -> true);
    }

    /**
     * Effective per-member channel map. A channel is on when the SACCO enables it and the member has not
     * opted out. Channels the SACCO has disabled are reported as off and cannot be turned on by the member.
     */
    public Map<String, Boolean> memberChannels(String tenantId, String memberId) {
        Map<String, Boolean> memberOverrides = rowMap(repository.findByTenantIdAndMemberId(tenantId, memberId));
        Map<String, Boolean> result = new LinkedHashMap<>();
        for (String channel : GATEABLE_CHANNELS) {
            boolean saccoOn = saccoChannelEnabled(tenantId, channel);
            boolean memberOn = memberOverrides.getOrDefault(channel, true);
            result.put(channel, saccoOn && memberOn);
        }
        return result;
    }

    public NotificationChannelPreference setSaccoChannel(String tenantId, String channel, boolean enabled) {
        return upsert(tenantId, NotificationChannelPreference.SACCO_LEVEL, channel, enabled);
    }

    public NotificationChannelPreference setMemberChannel(String tenantId, String memberId, String channel, boolean enabled) {
        return upsert(tenantId, memberId, channel, enabled);
    }

    private NotificationChannelPreference upsert(String tenantId, String memberId, String channel, boolean enabled) {
        NotificationChannelPreference existing = repository.findByTenantIdAndMemberIdAndChannel(tenantId, memberId, channel).orElse(null);
        if (existing != null) {
            existing.setEnabled(enabled);
            return repository.save(existing);
        }
        return repository.save(new NotificationChannelPreference(
                "ncp_" + UUID.randomUUID(), tenantId, memberId, channel, enabled));
    }

    private Map<String, Boolean> effectiveMap(List<NotificationChannelPreference> rows, java.util.function.Function<String, Boolean> fallback) {
        Map<String, Boolean> overrides = rowMap(rows);
        Map<String, Boolean> result = new LinkedHashMap<>();
        for (String channel : GATEABLE_CHANNELS) {
            result.put(channel, overrides.getOrDefault(channel, fallback.apply(channel)));
        }
        return result;
    }

    private Map<String, Boolean> rowMap(List<NotificationChannelPreference> rows) {
        Map<String, Boolean> map = new LinkedHashMap<>();
        rows.forEach(row -> map.put(row.getChannel(), row.isEnabled()));
        return map;
    }
}
