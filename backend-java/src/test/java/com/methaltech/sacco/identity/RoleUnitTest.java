package com.methaltech.sacco.identity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import org.junit.jupiter.api.Test;

class RoleUnitTest {

    @Test
    void customRoleCanBeRenamedWithoutChangingItsScope() {
        Role role = new Role("role_credit", "tenant_green", "Credit Viewer", false, "user_chair");

        role.rename("Credit Reviewer");

        assertEquals("Credit Reviewer", role.getName());
        assertEquals("tenant_green", role.getTenantId());
        assertFalse(role.isProtectedRole());
    }
}
