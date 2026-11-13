package com.methaltech.sacco.tenant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

class FleetIncidentStateTest {

    @Test
    void supportsTheCompleteIncidentLifecycle() {
        FleetIncidentState state = new FleetIncidentState("tenant_green:payments", "tenant_green", "payments");

        assertEquals("tenant_green:payments", state.getIncidentKey());
        assertEquals("tenant_green", state.getTenantId());
        assertEquals("payments", state.getIssueType());
        assertEquals("open", state.getWorkflowStatus());
        assertNotNull(state.getUpdatedAt());

        state.assign("user_one", " First Operator ");
        assertEquals("acknowledged", state.getWorkflowStatus());
        assertEquals("user_one", state.getAssigneeUserId());
        assertEquals(" First Operator ", state.getAssigneeName());
        assertNotNull(state.getAcknowledgedAt());

        state.escalate("user_two", "Supervisor", "user_three", "Incident Owner");
        assertEquals("escalated", state.getWorkflowStatus());
        assertEquals("user_two", state.getEscalatedByUserId());
        assertEquals("Supervisor", state.getEscalatedByName());
        assertEquals("user_three", state.getAssigneeUserId());
        assertNotNull(state.getEscalatedAt());

        state.resolve("user_three", "Incident Owner", "  Reconciled with provider  ");
        assertEquals("resolved", state.getWorkflowStatus());
        assertEquals("Reconciled with provider", state.getResolutionNote());
        assertNotNull(state.getResolvedAt());

        state.reopen();
        assertEquals("open", state.getWorkflowStatus());
        assertNull(state.getResolvedAt());
        assertNull(state.getResolutionNote());

        state.acknowledge("user_four", "Second Operator");
        assertEquals("acknowledged", state.getWorkflowStatus());
        assertEquals("user_four", state.getAssigneeUserId());
        assertNull(state.getResolvedAt());
    }

    @Test
    void directEscalationAndResolutionRecordAnAcknowledgement() {
        FleetIncidentState escalated = new FleetIncidentState("tenant_lake:sync", "tenant_lake", "sync");
        escalated.escalate("platform_admin", "Platform Admin", null, null);
        assertNotNull(escalated.getAcknowledgedAt());

        FleetIncidentState resolved = new FleetIncidentState("tenant_lake:alerts", "tenant_lake", "alerts");
        resolved.resolve("platform_admin", "Platform Admin", "Recovered");
        assertNotNull(resolved.getAcknowledgedAt());
        assertEquals("resolved", resolved.getWorkflowStatus());

        resolved.assign("user_five", "Observer");
        assertEquals("resolved", resolved.getWorkflowStatus());
        assertEquals("user_five", resolved.getAssigneeUserId());
    }
}
