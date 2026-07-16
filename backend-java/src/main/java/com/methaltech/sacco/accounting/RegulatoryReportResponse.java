package com.methaltech.sacco.accounting;

import java.time.Instant;
import java.util.List;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
class RegulatoryReportResponse {
    Instant generatedAt;
    String period;
    List<RegulatoryTenantReport> reports;
    RegulatoryTenantReport consolidated;
    String csv;
}
