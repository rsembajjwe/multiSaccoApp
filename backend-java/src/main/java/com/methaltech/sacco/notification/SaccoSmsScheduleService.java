package com.methaltech.sacco.notification;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
class SaccoSmsScheduleService {

    private final SaccoSmsScheduleRepository scheduleRepository;
    private final SaccoSmsBroadcastService broadcastService;

    SaccoSmsSchedule schedule(String tenantId, String title, String body, String mode, List<String> memberIds,
            Instant scheduledAt, String createdBy) {
        SaccoSmsBroadcastService.Preview preview = broadcastService.preview(tenantId, memberIds, mode, body);
        if (preview.recipients().isEmpty()) throw new IllegalArgumentException("No members with phone numbers were found.");
        if (preview.requiredCredits() > preview.availableCredits()) {
            throw new IllegalStateException("Insufficient SMS balance. Required: " + preview.requiredCredits()
                    + ", available: " + preview.availableCredits() + ".");
        }
        return scheduleRepository.save(new SaccoSmsSchedule(
                "sms_schedule_" + UUID.randomUUID(), tenantId, title, body, mode,
                memberIds == null ? List.of() : memberIds, scheduledAt, preview.requiredCredits(), createdBy));
    }

    List<SaccoSmsSchedule> list(String tenantId) {
        return scheduleRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
    }

    SaccoSmsSchedule cancel(String tenantId, String scheduleId) {
        SaccoSmsSchedule schedule = scheduleRepository.findById(scheduleId)
                .filter(item -> tenantId.equals(item.getTenantId()))
                .orElseThrow(() -> new IllegalArgumentException("Scheduled SMS was not found."));
        if (!"scheduled".equals(schedule.getStatus())) throw new IllegalStateException("Only pending scheduled SMS can be cancelled.");
        schedule.cancel();
        return scheduleRepository.save(schedule);
    }

    @Scheduled(fixedDelayString = "${sacco.sms.schedule-poll-ms:30000}")
    @Transactional
    void sendDue() {
        scheduleRepository.findTop100ByStatusAndScheduledAtLessThanEqualOrderByScheduledAtAsc("scheduled", Instant.now())
                .forEach(this::sendClaimed);
    }

    private void sendClaimed(SaccoSmsSchedule schedule) {
        if (scheduleRepository.claim(schedule.getId(), Instant.now()) == 0) return;
        try {
            SaccoSmsBroadcastService.SendResult result = broadcastService.send(
                    schedule.getTenantId(), schedule.selectedMemberIds(), schedule.getMessageMode(),
                    schedule.getTitle(), schedule.getBody());
            schedule.sent(result);
        } catch (RuntimeException exception) {
            schedule.failed(exception.getMessage());
        }
        scheduleRepository.save(schedule);
    }
}
