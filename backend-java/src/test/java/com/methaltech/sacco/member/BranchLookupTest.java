package com.methaltech.sacco.member;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.methaltech.sacco.branch.Branch;
import com.methaltech.sacco.branch.BranchRepository;
import java.lang.reflect.Constructor;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class BranchLookupTest {

    private final BranchRepository branchRepository = mock(BranchRepository.class);
    private final BranchLookup lookup = new BranchLookup(branchRepository);

    @Test
    void existsInTenantRejectsBlankInputWithoutRepositoryCall() {
        assertFalse(lookup.existsInTenant(null, "tenant_green"));
        assertFalse(lookup.existsInTenant(" ", "tenant_green"));
        verifyNoInteractions(branchRepository);
    }

    @Test
    void existsInTenantRequiresBranchToBelongToRequestedTenant() {
        when(branchRepository.findById("branch_green_main"))
                .thenReturn(Optional.of(branch("branch_green_main", "tenant_green", "MAIN", "user_green_manager")));
        when(branchRepository.findById("branch_lake_main"))
                .thenReturn(Optional.of(branch("branch_lake_main", "tenant_lake", "MAIN", "user_lake_manager")));

        assertTrue(lookup.existsInTenant(" branch_green_main ", "tenant_green"));
        assertFalse(lookup.existsInTenant("branch_lake_main", "tenant_green"));
    }

    @Test
    void findSummaryTrimsIdAndReturnsBranchSnapshot() {
        when(branchRepository.findById("branch_green_main"))
                .thenReturn(Optional.of(branch("branch_green_main", "tenant_green", "MAIN", "user_green_manager")));

        BranchLookup.BranchSummary summary = lookup.findSummary(" branch_green_main ").orElseThrow();

        assertEquals("branch_green_main", summary.id());
        assertEquals("tenant_green", summary.tenantId());
        assertEquals("MAIN", summary.code());
        assertEquals("Mukono Main", summary.name());
        assertEquals("user_green_manager", summary.managerUserId());
        assertEquals("active", summary.status());
    }

    @Test
    void defaultBranchUsesFirstCodeOrderedBranch() {
        when(branchRepository.findByTenantIdOrderByCodeAsc("tenant_green"))
                .thenReturn(List.of(
                        branch("branch_green_a", "tenant_green", "A", "user_green_manager"),
                        branch("branch_green_b", "tenant_green", "B", "user_green_manager")));

        assertEquals(Optional.of("branch_green_a"), lookup.defaultBranchId("tenant_green"));
    }

    @Test
    void managedBranchIdsAreTenantAndManagerScoped() {
        when(branchRepository.findByTenantIdAndManagerUserIdOrderByCodeAsc("tenant_green", "user_green_manager"))
                .thenReturn(List.of(
                        branch("branch_green_main", "tenant_green", "MAIN", "user_green_manager"),
                        branch("branch_green_seeta", "tenant_green", "SEE", "user_green_manager")));

        assertEquals(
                List.of("branch_green_main", "branch_green_seeta"),
                lookup.managedBranchIds(" tenant_green ", " user_green_manager "));
    }

    @Test
    void managedBranchIdsRejectBlankInputsWithoutRepositoryCall() {
        assertEquals(List.of(), lookup.managedBranchIds(null, "user_green_manager"));
        assertEquals(List.of(), lookup.managedBranchIds("tenant_green", " "));
    }

    private Branch branch(String id, String tenantId, String code, String managerUserId) {
        try {
            Constructor<Branch> constructor = Branch.class.getDeclaredConstructor(
                    String.class,
                    String.class,
                    String.class,
                    String.class,
                    String.class,
                    String.class,
                    String.class);
            constructor.setAccessible(true);
            return constructor.newInstance(id, tenantId, code, "Mukono Main", "Mukono town", managerUserId, "active");
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("Could not create branch test fixture.", e);
        }
    }
}
