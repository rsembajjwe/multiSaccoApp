package com.methaltech.sacco.accounting;

import java.math.BigDecimal;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
class RegulatoryTenantReport {
    String tenantId;
    String tenantName;
    int memberCount;
    int activeMembers;
    BigDecimal savings;
    BigDecimal shares;
    BigDecimal welfare;
    BigDecimal loanPortfolio;
    int activeLoans;
    BigDecimal loansAtRisk;
    int parPercent;
    BigDecimal expenseTotal;
    BigDecimal assetCost;
    BigDecimal assetNetBookValue;
    int journalEntries;
    int unbalancedJournalEntries;
    int reconciliationExceptions;
    int openComplaints;
    int openResolutions;
    String complianceStatus;
}
