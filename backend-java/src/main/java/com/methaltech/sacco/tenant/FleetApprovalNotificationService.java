package com.methaltech.sacco.tenant;

import com.methaltech.sacco.notification.NotificationService;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Service
class FleetApprovalNotificationService {
    private static final Logger log = LoggerFactory.getLogger(FleetApprovalNotificationService.class);
    private static final int PAGE_SIZE = 200;
    private final FleetBulkJobRepository jobRepository;
    private final NotificationService notificationService;

    FleetApprovalNotificationService(FleetBulkJobRepository jobRepository, NotificationService notificationService) {
        this.jobRepository = jobRepository;
        this.notificationService = notificationService;
    }

    void notifySubmitted(FleetBulkJob job) {
        safely(() -> notificationService.notifyFleetApprovalRequested(job.getId(), action(job),
                job.getRequestedCount(), job.getRequestedBy(), job.getRequestedByName()), job.getId(), "submitted");
    }

    void notifyDecision(FleetBulkJob job, String decision) {
        safely(() -> notificationService.notifyFleetApprovalDecision(job.getId(), job.getRequestedBy(), decision,
                job.getDecidedByName(), job.getDecisionReason()), job.getId(), decision);
    }

    int escalatePendingAt(Instant now) {
        int notified = 0;
        int pageNumber = 0;
        Page<FleetBulkJob> page;
        do {
            page = jobRepository.findByStatusAndApprovalDueSoonAtLessThanEqual("pending_approval", now,
                    PageRequest.of(pageNumber++, PAGE_SIZE, Sort.by("approvalDueSoonAt").ascending()));
            for (FleetBulkJob job : page.getContent()) {
                boolean overdue = job.getApprovalDueAt() != null && !now.isBefore(job.getApprovalDueAt());
                try {
                    notified += notificationService.notifyFleetApprovalEscalation(job.getId(), action(job),
                            job.getRequestedCount(), job.getRequestedBy(), overdue);
                } catch (RuntimeException exception) {
                    log.warn("Could not send fleet approval {} notification for job {}: {}",
                            overdue ? "overdue" : "due-soon", job.getId(), exception.getMessage());
                }
            }
        } while (page.hasNext());
        return notified;
    }

    private String action(FleetBulkJob job) {
        if (job.getTargetStatus() != null) return "set lifecycle status to " + job.getTargetStatus().replace('_', ' ');
        if (job.getAccountManagerName() != null && !job.getAccountManagerName().isBlank()) {
            return "assign portfolio owner " + job.getAccountManagerName();
        }
        return "remove the portfolio owner";
    }

    private void safely(Runnable action, String jobId, String stage) {
        try {
            action.run();
        } catch (RuntimeException exception) {
            log.warn("Could not send fleet approval {} notification for job {}: {}", stage, jobId, exception.getMessage());
        }
    }
}
