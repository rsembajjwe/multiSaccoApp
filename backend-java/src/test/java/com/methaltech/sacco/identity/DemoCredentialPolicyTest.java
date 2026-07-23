package com.methaltech.sacco.identity;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class DemoCredentialPolicyTest {

    @Test
    void productionBlocksSeededStaffIdentifiersAndDemoDomains() {
        DemoCredentialPolicy policy = new DemoCredentialPolicy(false);

        assertFalse(policy.staffLoginAllowed("admin@platform.local"));
        assertFalse(policy.staffLoginAllowed("TREASURER@GREENVALLEY.LOCAL"));
        assertFalse(policy.staffLoginAllowed("new-support@platform.local"));
        assertFalse(policy.staffLoginAllowed("admin@lakefarmers.local"));
        assertTrue(policy.staffLoginAllowed("real.admin@tereka.online"));
    }

    @Test
    void demoProfileAllowsSeededStaffIdentifiers() {
        DemoCredentialPolicy policy = new DemoCredentialPolicy(true);

        assertTrue(policy.staffLoginAllowed("admin@platform.local"));
        assertTrue(policy.staffLoginAllowed("new-support@platform.local"));
    }

    @Test
    void productionBlocksSeededMemberIdentifiersAndDemoEmails() {
        DemoCredentialPolicy policy = new DemoCredentialPolicy(false);

        assertFalse(policy.memberLoginAllowed("GVS-0001"));
        assertFalse(policy.memberLoginAllowed("GVS-0009"));
        assertFalse(policy.memberLoginAllowed("amina@example.local"));
        assertFalse(policy.memberLoginAllowed("future-member@example.local"));
        assertTrue(policy.memberLoginAllowed("GVS-8244"));
        assertTrue(policy.memberLoginAllowed("+256700555111"));
    }

    @Test
    void demoProfileAllowsSeededMemberIdentifiers() {
        DemoCredentialPolicy policy = new DemoCredentialPolicy(true);

        assertTrue(policy.memberLoginAllowed("GVS-0001"));
        assertTrue(policy.memberLoginAllowed("amina@example.local"));
    }
}
