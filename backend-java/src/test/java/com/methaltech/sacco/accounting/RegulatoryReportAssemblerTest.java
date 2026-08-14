package com.methaltech.sacco.accounting;

import static org.assertj.core.api.Assertions.assertThat;

import com.methaltech.sacco.member.DataProtectionEvidence;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class RegulatoryReportAssemblerTest {

    @Test
    void consolidateSumsTenantMetricsAndKeepsClearStatusWhenEvidenceIsReady() {
        RegulatoryTenantReport consolidated = RegulatoryReportAssembler.consolidate(List.of(
                report("tenant_green", "Green Valley SACCO", money("100000"), money("40000"), 0, 0, readyEvidence()),
                report("tenant_lake", "Lake Farmers SACCO", money("50000"), money("10000"), 0, 0, readyEvidence())));

        assertThat(consolidated.getTenantId()).isEqualTo("consolidated");
        assertThat(consolidated.getMemberCount()).isEqualTo(30);
        assertThat(consolidated.getActiveMembers()).isEqualTo(24);
        assertThat(consolidated.getSavings()).isEqualByComparingTo("300000");
        assertThat(consolidated.getLoanPortfolio()).isEqualByComparingTo("150000");
        assertThat(consolidated.getLoansAtRisk()).isEqualByComparingTo("50000");
        assertThat(consolidated.getParPercent()).isEqualTo(33);
        assertThat(consolidated.getDataProtectionEvidence().privacyNoticeAcceptedMembers()).isEqualTo(20);
        assertThat(consolidated.getDataProtectionEvidence().evidenceStatus()).isEqualTo("ready");
        assertThat(consolidated.getComplianceStatus()).isEqualTo("clear");
    }

    @Test
    void consolidateMarksReviewWhenLedgerOrDataProtectionEvidenceHasOpenItems() {
        RegulatoryTenantReport consolidated = RegulatoryReportAssembler.consolidate(List.of(
                report("tenant_green", "Green Valley SACCO", money("100000"), money("10000"), 1, 0, readyEvidence()),
                report("tenant_lake", "Lake Farmers SACCO", money("50000"), money("0"), 0, 2, reviewEvidence())));

        assertThat(consolidated.getReconciliationExceptions()).isEqualTo(1);
        assertThat(consolidated.getUnbalancedJournalEntries()).isEqualTo(2);
        assertThat(consolidated.getDataProtectionEvidence().openPrivacyRequests()).isEqualTo(1);
        assertThat(consolidated.getDataProtectionEvidence().kycDocumentsReviewDue()).isEqualTo(1);
        assertThat(consolidated.getDataProtectionEvidence().evidenceStatus()).isEqualTo("review");
        assertThat(consolidated.getComplianceStatus()).isEqualTo("review");
    }

    @Test
    void percentHandlesZeroDenominatorAndRoundsHalfUp() {
        assertThat(RegulatoryReportAssembler.percent(money("0"), money("0"))).isZero();
        assertThat(RegulatoryReportAssembler.percent(money("125"), money("1000"))).isEqualTo(13);
        assertThat(RegulatoryReportAssembler.percent(money("124"), money("1000"))).isEqualTo(12);
    }

    @Test
    void csvIncludesComplianceEvidenceAndEscapesTenantNames() {
        String csv = RegulatoryReportAssembler.csv(List.of(
                report("tenant_quote", "Women \"Growth\" SACCO", money("1000"), money("0"), 0, 0, readyEvidence())));

        assertThat(csv).startsWith("\"tenant\",\"members\",\"active_members\"");
        assertThat(csv).contains("\"Women \"\"Growth\"\" SACCO\"");
        assertThat(csv).contains("\"ready\",\"clear\"");
    }

    private static RegulatoryTenantReport report(
            String tenantId,
            String tenantName,
            BigDecimal loanPortfolio,
            BigDecimal loansAtRisk,
            int reconciliationExceptions,
            int unbalancedJournalEntries,
            DataProtectionEvidence evidence) {
        return RegulatoryTenantReport.builder()
                .tenantId(tenantId)
                .tenantName(tenantName)
                .memberCount(15)
                .activeMembers(12)
                .savings(money("150000"))
                .shares(money("30000"))
                .welfare(money("12000"))
                .loanPortfolio(loanPortfolio)
                .activeLoans(3)
                .loansAtRisk(loansAtRisk)
                .parPercent(RegulatoryReportAssembler.percent(loansAtRisk, loanPortfolio))
                .expenseTotal(money("8000"))
                .assetCost(money("25000"))
                .assetNetBookValue(money("20000"))
                .journalEntries(9)
                .unbalancedJournalEntries(unbalancedJournalEntries)
                .reconciliationExceptions(reconciliationExceptions)
                .openComplaints(1)
                .openResolutions(2)
                .dataProtectionEvidence(evidence)
                .complianceStatus(reconciliationExceptions == 0 && unbalancedJournalEntries == 0 && "ready".equals(evidence.evidenceStatus()) ? "clear" : "review")
                .build();
    }

    private static DataProtectionEvidence readyEvidence() {
        return new DataProtectionEvidence(10, 9, 2, 0, 2, 1, 6, 0, 4, 2, 2, 1, 0, 0, "ready");
    }

    private static DataProtectionEvidence reviewEvidence() {
        return new DataProtectionEvidence(8, 7, 3, 1, 2, 1, 6, 1, 3, 2, 1, 1, 0, 0, "review");
    }

    private static BigDecimal money(String value) {
        return new BigDecimal(value);
    }
}
