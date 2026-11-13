package com.methaltech.sacco.tenant;

import static org.junit.jupiter.api.Assertions.assertEquals;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;

class FleetBulkJobMetricsTest {
    @Test
    void recordsBoundedOperationalCounters() {
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        FleetBulkJobMetrics metrics = new FleetBulkJobMetrics(registry);

        metrics.submitted(3);
        metrics.organizationProcessed("completed");
        metrics.organizationProcessed("failed");
        metrics.completed("completed_with_errors");
        metrics.recovered("system-watchdog-recovery");

        assertEquals(1, registry.get("sacco.fleet.bulk_job.events")
                .tags("event", "submitted", "outcome", "accepted").counter().count());
        assertEquals(3, registry.get("sacco.fleet.bulk_job.organizations")
                .tag("outcome", "requested").counter().count());
        assertEquals(1, registry.get("sacco.fleet.bulk_job.organizations")
                .tag("outcome", "failed").counter().count());
        assertEquals(1, registry.get("sacco.fleet.bulk_job.events")
                .tags("event", "completed", "outcome", "completed_with_errors").counter().count());
        assertEquals(1, registry.get("sacco.fleet.bulk_job.recoveries")
                .tag("source", "system-watchdog-recovery").counter().count());
    }
}
