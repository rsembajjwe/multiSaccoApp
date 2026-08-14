package com.methaltech.sacco.branch;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.Test;

class BranchUnitTest {

    @Test
    void branchCarriesTenantManagerAndAuditMetadata() {
        Branch branch = new Branch(
                "branch_green_mukono",
                "tenant_green",
                "MUK",
                "Mukono Branch",
                "Mukono town",
                "user_green_branch_manager",
                "active");

        assertEquals("branch_green_mukono", branch.getId());
        assertEquals("tenant_green", branch.getTenantId());
        assertEquals("MUK", branch.getCode());
        assertEquals("Mukono Branch", branch.getName());
        assertEquals("Mukono town", branch.getAddress());
        assertEquals("user_green_branch_manager", branch.getManagerUserId());
        assertEquals("active", branch.getStatus());
        assertNotNull(branch.getCreatedAt());
        assertNotNull(branch.getUpdatedAt());
    }

    @Test
    void responseExposesBranchScopeFields() {
        Branch branch = new Branch(
                "branch_green_seeta",
                "tenant_green",
                "SEE",
                "Seeta Branch",
                "Seeta trading center",
                "user_green_branch_manager",
                "active");

        BranchResponse response = BranchResponse.from(branch);

        assertEquals("branch_green_seeta", response.id());
        assertEquals("tenant_green", response.tenantId());
        assertEquals("SEE", response.code());
        assertEquals("Seeta Branch", response.name());
        assertEquals("user_green_branch_manager", response.managerUserId());
        assertEquals("active", response.status());
        assertNotNull(response.createdAt());
        assertNotNull(response.updatedAt());
    }
}
