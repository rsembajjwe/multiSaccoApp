package com.methaltech.sacco.tenant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class CollectionModeUnitTest {

    @Test
    void channelPermissionsMatchEachCollectionMode() {
        assertFalse(CollectionMode.NONE.allowsMobileMoney());
        assertFalse(CollectionMode.NONE.allowsBank());

        assertTrue(CollectionMode.MOBILE_MONEY_ONLY.allowsMobileMoney());
        assertFalse(CollectionMode.MOBILE_MONEY_ONLY.allowsBank());

        assertFalse(CollectionMode.BANK_ONLY.allowsMobileMoney());
        assertTrue(CollectionMode.BANK_ONLY.allowsBank());

        assertTrue(CollectionMode.BOTH.allowsMobileMoney());
        assertTrue(CollectionMode.BOTH.allowsBank());
    }

    @Test
    void parseAcceptsCaseAndWhitespaceButRejectsUnknownValues() {
        assertEquals(CollectionMode.BOTH, CollectionMode.parse(" both "));
        assertEquals(CollectionMode.MOBILE_MONEY_ONLY, CollectionMode.parse("mobile_money_only"));
        assertEquals(CollectionMode.BANK_ONLY, CollectionMode.parse("BANK_ONLY"));
        assertEquals(null, CollectionMode.parse(null));
        assertEquals(null, CollectionMode.parse("wallet"));
    }

    @Test
    void storedValuesDefaultSafelyToNone() {
        assertEquals(CollectionMode.NONE, CollectionMode.fromStored(null));
        assertEquals(CollectionMode.NONE, CollectionMode.fromStored(""));
        assertEquals(CollectionMode.NONE, CollectionMode.fromStored("unknown"));
        assertEquals(CollectionMode.BANK_ONLY, CollectionMode.fromStored("BANK_ONLY"));
    }

    @Test
    void newSaccoStartsWithNoOnlineCollectionAvailable() {
        Tenant tenant = new Tenant(
                "tenant_new",
                "New SACCO",
                "NEW",
                "REG-001",
                "Kampala",
                LocalDate.of(2027, 12, 31),
                "pkg_basic");

        assertEquals(CollectionMode.NONE, tenant.getAllowedCollectionMode());
        assertFalse(tenant.isMobileMoneyCollectionActive());
        assertFalse(tenant.isBankCollectionActive());
        assertFalse(tenant.mobileMoneyCollectionAvailable());
        assertFalse(tenant.bankCollectionAvailable());
    }

    @Test
    void platformModeChangeDeactivatesChannelsThatAreNoLongerAllowed() {
        Tenant tenant = new Tenant(
                "tenant_green",
                "Green Valley SACCO",
                "GVS",
                "REG-002",
                "Mukono",
                LocalDate.of(2027, 12, 31),
                "pkg_growth");

        tenant.updateAllowedCollectionMode(CollectionMode.BOTH);
        tenant.updateCollectionActivation(true, true);
        assertTrue(tenant.mobileMoneyCollectionAvailable());
        assertTrue(tenant.bankCollectionAvailable());

        tenant.updateAllowedCollectionMode(CollectionMode.BANK_ONLY);
        assertFalse(tenant.isMobileMoneyCollectionActive());
        assertTrue(tenant.isBankCollectionActive());
        assertFalse(tenant.mobileMoneyCollectionAvailable());
        assertTrue(tenant.bankCollectionAvailable());

        tenant.updateAllowedCollectionMode(CollectionMode.NONE);
        assertFalse(tenant.isMobileMoneyCollectionActive());
        assertFalse(tenant.isBankCollectionActive());
        assertFalse(tenant.mobileMoneyCollectionAvailable());
        assertFalse(tenant.bankCollectionAvailable());
    }
}
