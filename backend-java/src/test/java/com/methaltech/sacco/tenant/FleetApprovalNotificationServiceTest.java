package com.methaltech.sacco.tenant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.methaltech.sacco.notification.NotificationService;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

class FleetApprovalNotificationServiceTest {

    @Test
    void notifiesEligibleCheckersWhenRequestIsSubmitted() {
        FleetBulkJobRepository jobs = mock(FleetBulkJobRepository.class);
        NotificationService notifications = mock(NotificationService.class);
        FleetBulkJob job = job("job_new");

        new FleetApprovalNotificationService(jobs, notifications).notifySubmitted(job);

        verify(notifications).notifyFleetApprovalRequested(
                "job_new", "set lifecycle status to suspended", 3, "maker", "Maker");
    }

    @Test
    void sendsDueSoonStageAfterFourHours() {
        FleetBulkJobRepository jobs = mock(FleetBulkJobRepository.class);
        NotificationService notifications = mock(NotificationService.class);
        FleetBulkJob job = job("job_due");
        when(jobs.findByStatusAndApprovalDueSoonAtLessThanEqual(eq("pending_approval"), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(job)));
        when(notifications.notifyFleetApprovalEscalation(
                "job_due", "set lifecycle status to suspended", 3, "maker", false)).thenReturn(2);

        int sent = new FleetApprovalNotificationService(jobs, notifications)
                .escalatePendingAt(job.getApprovalDueSoonAt().plusSeconds(1));

        assertEquals(2, sent);
        verify(notifications).notifyFleetApprovalEscalation(
                "job_due", "set lifecycle status to suspended", 3, "maker", false);
    }

    @Test
    void sendsOverdueStageAfterEightHours() {
        FleetBulkJobRepository jobs = mock(FleetBulkJobRepository.class);
        NotificationService notifications = mock(NotificationService.class);
        FleetBulkJob job = job("job_overdue");
        when(jobs.findByStatusAndApprovalDueSoonAtLessThanEqual(eq("pending_approval"), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(job)));
        when(notifications.notifyFleetApprovalEscalation(
                "job_overdue", "set lifecycle status to suspended", 3, "maker", true)).thenReturn(1);

        int sent = new FleetApprovalNotificationService(jobs, notifications)
                .escalatePendingAt(job.getApprovalDueAt().plusSeconds(1));

        assertEquals(1, sent);
        verify(notifications).notifyFleetApprovalEscalation(
                "job_overdue", "set lifecycle status to suspended", 3, "maker", true);
    }

    private FleetBulkJob job(String id) {
        FleetBulkJob job = new FleetBulkJob(id, "maker", "Maker", 3,
                "suspended", null, null, "Compliance intervention");
        job.assignApprovalDeadlines(Instant.now().plusSeconds(4 * 3600), Instant.now().plusSeconds(8 * 3600));
        return job;
    }
}
