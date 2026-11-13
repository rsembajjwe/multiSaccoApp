package com.methaltech.sacco.tenant;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Service
class FleetApprovalDeadlineService {
    private static final Logger log = LoggerFactory.getLogger(FleetApprovalDeadlineService.class);
    private static final int BACKFILL_BATCH_SIZE = 200;
    private final FleetBulkJobRepository jobRepository;
    private final FleetApprovalBusinessCalendar calendar;

    FleetApprovalDeadlineService(FleetBulkJobRepository jobRepository, FleetApprovalBusinessCalendar calendar) {
        this.jobRepository = jobRepository;
        this.calendar = calendar;
    }

    void assign(FleetBulkJob job) {
        FleetApprovalBusinessCalendar.ApprovalDeadlines deadlines = calendar.deadlinesFrom(job.getCreatedAt());
        job.assignApprovalDeadlines(deadlines.dueSoonAt(), deadlines.dueAt());
    }

    @EventListener(ApplicationReadyEvent.class)
    void backfillPendingApprovals() {
        int updated = 0;
        Page<FleetBulkJob> page;
        do {
            page = jobRepository.findByStatusAndApprovalDueAtIsNull("pending_approval",
                    PageRequest.of(0, BACKFILL_BATCH_SIZE, Sort.by("createdAt").ascending()));
            List<FleetBulkJob> jobs = page.getContent();
            jobs.forEach(this::assign);
            if (!jobs.isEmpty()) jobRepository.saveAllAndFlush(jobs);
            updated += jobs.size();
        } while (page.hasNext());
        if (updated > 0) log.info("Backfilled business-calendar deadlines for {} pending fleet approvals", updated);
    }
}
