package com.methaltech.sacco.accounting;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.math.BigDecimal;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class MobileMoneyPaymentRulesTest {

    @Test
    void contributionPurposesAreLimitedToMemberBalanceProducts() {
        assertThat(MobileMoneyPaymentRules.contributionPurpose("savings_deposit")).isTrue();
        assertThat(MobileMoneyPaymentRules.contributionPurpose(" share_purchase ")).isTrue();
        assertThat(MobileMoneyPaymentRules.contributionPurpose("welfare_contribution")).isTrue();

        assertThat(MobileMoneyPaymentRules.contributionPurpose(null)).isFalse();
        assertThat(MobileMoneyPaymentRules.contributionPurpose("")).isFalse();
        assertThat(MobileMoneyPaymentRules.contributionPurpose("loan_repayment")).isFalse();
        assertThat(MobileMoneyPaymentRules.contributionPurpose("subscription")).isFalse();
    }

    @Test
    void staffCanOnlyManuallyCloseRequestsWithNonPostedTerminalStatuses() {
        assertThat(MobileMoneyPaymentRules.staffClosureStatus("failed")).isTrue();
        assertThat(MobileMoneyPaymentRules.staffClosureStatus(" expired ")).isTrue();
        assertThat(MobileMoneyPaymentRules.staffClosureStatus("cancelled")).isTrue();

        assertThat(MobileMoneyPaymentRules.staffClosureStatus(null)).isFalse();
        assertThat(MobileMoneyPaymentRules.staffClosureStatus("pending")).isFalse();
        assertThat(MobileMoneyPaymentRules.staffClosureStatus("posted")).isFalse();
    }

    @Test
    void terminalStatusesIncludeProviderPostedButNotPending() {
        assertThat(MobileMoneyPaymentRules.terminalStatus("failed")).isTrue();
        assertThat(MobileMoneyPaymentRules.terminalStatus("expired")).isTrue();
        assertThat(MobileMoneyPaymentRules.terminalStatus("cancelled")).isTrue();
        assertThat(MobileMoneyPaymentRules.terminalStatus("posted")).isTrue();

        assertThat(MobileMoneyPaymentRules.terminalStatus("pending")).isFalse();
        assertThat(MobileMoneyPaymentRules.terminalStatus(null)).isFalse();
    }

    @Test
    void providerPostedStatusCompletesRequestAtProviderCheckTime() {
        MobileMoneyPaymentRequestEntity request = pendingRequest();
        Instant checkedAt = Instant.parse("2026-08-14T10:30:00Z");

        request.syncProviderStatus(new MobileMoneyProviderStatusResult(
                "posted",
                "Provider confirms payment posted",
                "PROV-POSTED",
                "SUCCESSFUL",
                false,
                checkedAt));

        assertEquals("posted", request.getStatus());
        assertEquals("Provider confirms payment posted", request.getStatusMessage());
        assertEquals("PROV-POSTED", request.getProviderReference());
        assertEquals(checkedAt, request.getCompletedAt());
        assertEquals(checkedAt, request.getUpdatedAt());
    }

    @Test
    void manualCancelledStatusCompletesRequestWithTrimmedReason() {
        MobileMoneyPaymentRequestEntity request = pendingRequest();

        request.updateStatus("cancelled", "  Member requested cancellation  ");

        assertEquals("cancelled", request.getStatus());
        assertEquals("Member requested cancellation", request.getStatusMessage());
        assertNotNull(request.getCompletedAt());
    }

    private static MobileMoneyPaymentRequestEntity pendingRequest() {
        return MobileMoneyPaymentRequestEntity.from(new MobileMoneyPaymentResult(
                "pay_1",
                "tenant_green",
                "member_amina",
                "savings_deposit",
                new BigDecimal("45000"),
                "UGX",
                "mtn_momo",
                "EXT-1",
                "PROV-1",
                "pending",
                "Awaiting member approval",
                "Approve on phone",
                false,
                Instant.parse("2026-08-14T09:00:00Z")), null, "+256700000001", "{}");
    }
}
