package com.methaltech.sacco.tenant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class FleetBulkJobApprovalTest {

    @Test
    void requiresDifferentOperatorBeforeExecution() {
        FleetBulkJob job = job();

        assertEquals("pending_approval", job.getStatus());
        assertThrows(IllegalStateException.class, job::start);
        assertThrows(IllegalStateException.class,
                () -> job.approve("requester", "Requester", "Self approval"));

        job.approve("checker", "Checker", "Scope and impact verified");

        assertEquals("queued", job.getStatus());
        assertEquals("checker", job.getDecidedBy());
        assertEquals("Scope and impact verified", job.getDecisionReason());
        assertNotNull(job.getDecidedAt());
    }

    @Test
    void rejectionIsTerminalAndCapturesEvidence() {
        FleetBulkJob job = job();

        job.reject("checker", "Checker", "Selection includes the wrong portfolio");

        assertEquals("rejected", job.getStatus());
        assertEquals("Checker", job.getDecidedByName());
        assertNotNull(job.getFinishedAt());
        assertThrows(IllegalStateException.class,
                () -> job.approve("another", "Another checker", "Retry"));
    }

    private FleetBulkJob job() {
        return new FleetBulkJob("job_test", "requester", "Maker", 3,
                "suspended", null, null, "Repeated compliance breach");
    }
}
