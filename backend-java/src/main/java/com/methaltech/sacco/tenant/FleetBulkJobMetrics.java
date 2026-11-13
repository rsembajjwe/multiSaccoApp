package com.methaltech.sacco.tenant;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

@Component
class FleetBulkJobMetrics {
    private final MeterRegistry meterRegistry;

    FleetBulkJobMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    void submitted(int organizationCount) {
        counter("submitted", "accepted").increment();
        meterRegistry.counter("sacco.fleet.bulk_job.organizations", "outcome", "requested")
                .increment(organizationCount);
    }

    void organizationProcessed(String outcome) {
        meterRegistry.counter("sacco.fleet.bulk_job.organizations", "outcome", outcome).increment();
    }

    void completed(String outcome) {
        counter("completed", outcome).increment();
    }

    void recovered(String source) {
        meterRegistry.counter("sacco.fleet.bulk_job.recoveries", "source", source).increment();
    }

    private Counter counter(String event, String outcome) {
        return meterRegistry.counter("sacco.fleet.bulk_job.events", "event", event, "outcome", outcome);
    }
}
