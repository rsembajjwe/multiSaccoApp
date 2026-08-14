package com.methaltech.sacco.approval;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ApprovalDomainUnitTest {

    @Test
    void approvalRulesOnlyAllowSupportedProductionModules() {
        assertThat(ApprovalRules.supportsModule("members")).isTrue();
        assertThat(ApprovalRules.supportsModule(" transactions ")).isTrue();
        assertThat(ApprovalRules.supportsModule("governance")).isTrue();

        assertThat(ApprovalRules.supportsModule(null)).isFalse();
        assertThat(ApprovalRules.supportsModule("")).isFalse();
        assertThat(ApprovalRules.supportsModule("operations")).isFalse();
        assertThat(ApprovalRules.supportsModule("platform_users")).isFalse();
    }

    @Test
    void approvalRulesNormalizeKnownDecisionsAndRejectUnknownOnes() {
        assertThat(ApprovalRules.normalizeDecision(" approved ")).isEqualTo("approved");
        assertThat(ApprovalRules.normalizeDecision("rejected")).isEqualTo("rejected");
        assertThat(ApprovalRules.normalizeDecision("corrections_requested")).isEqualTo("corrections_requested");

        assertThat(ApprovalRules.normalizeDecision(null)).isNull();
        assertThat(ApprovalRules.normalizeDecision("")).isNull();
        assertThat(ApprovalRules.normalizeDecision("APPROVED")).isNull();
        assertThat(ApprovalRules.normalizeDecision("cancelled")).isNull();
    }

    @Test
    void approvalRulesRequireReasonsForNegativeOrCorrectionDecisionsOnly() {
        assertThat(ApprovalRules.requiresReason("rejected")).isTrue();
        assertThat(ApprovalRules.requiresReason("corrections_requested")).isTrue();

        assertThat(ApprovalRules.requiresReason("approved")).isFalse();
        assertThat(ApprovalRules.requiresReason("pending")).isFalse();
        assertThat(ApprovalRules.requiresReason(null)).isFalse();
    }

    @Test
    void workflowResponsePreservesScopeAndAuditFields() {
        ApprovalWorkflow workflow = new ApprovalWorkflow(
                "workflow_1",
                "tenant_green",
                "Member onboarding approval",
                "members",
                true,
                "user_secretary");

        ApprovalWorkflowResponse response = ApprovalWorkflowResponse.from(workflow);

        assertThat(response.id()).isEqualTo("workflow_1");
        assertThat(response.tenantId()).isEqualTo("tenant_green");
        assertThat(response.name()).isEqualTo("Member onboarding approval");
        assertThat(response.module()).isEqualTo("members");
        assertThat(response.active()).isTrue();
        assertThat(response.createdByUserId()).isEqualTo("user_secretary");
        assertThat(response.createdAt()).isNotNull();
        assertThat(response.updatedAt()).isEqualTo(response.createdAt());
    }

    @Test
    void decisionResponsePreservesResourceDecisionAndReasonAuditTrail() {
        ApprovalDecision decision = new ApprovalDecision(
                "decision_1",
                "tenant_green",
                "workflow_1",
                "financial_transaction",
                "txn_1",
                "rejected",
                "user_treasurer",
                "Duplicate deposit reference");

        ApprovalDecisionResponse response = ApprovalDecisionResponse.from(decision);

        assertThat(response.id()).isEqualTo("decision_1");
        assertThat(response.tenantId()).isEqualTo("tenant_green");
        assertThat(response.workflowId()).isEqualTo("workflow_1");
        assertThat(response.resourceType()).isEqualTo("financial_transaction");
        assertThat(response.resourceId()).isEqualTo("txn_1");
        assertThat(response.decision()).isEqualTo("rejected");
        assertThat(response.decidedByUserId()).isEqualTo("user_treasurer");
        assertThat(response.reason()).isEqualTo("Duplicate deposit reference");
        assertThat(response.createdAt()).isNotNull();
    }
}
