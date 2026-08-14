package com.methaltech.sacco.tenant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class SaccoPaymentAccountUnitTest {

    @Test
    void mobileMoneyAccountIsActiveAndIdentifiedByChannel() {
        SaccoPaymentAccount account = new SaccoPaymentAccount(
                "paymentaccount_1",
                "tenant_green",
                SaccoPaymentAccount.CHANNEL_MOBILE_MONEY,
                "mtn",
                "Green Valley SACCO Collections",
                "+256700000111",
                null,
                null,
                null,
                "Use your membership number as the payment reference.");

        assertTrue(account.isActive());
        assertTrue(account.isMobileMoney());
        assertFalse(account.isBank());
        assertEquals("tenant_green", account.getTenantId());
        assertEquals("mtn", account.getNetwork());
        assertEquals("+256700000111", account.getAccountNumber());
        assertNotNull(account.getCreatedAt());
        assertNotNull(account.getUpdatedAt());
    }

    @Test
    void bankAccountCanBeUpdatedAndSuspendedWithoutChangingOwnership() {
        SaccoPaymentAccount account = new SaccoPaymentAccount(
                "paymentaccount_2",
                "tenant_green",
                SaccoPaymentAccount.CHANNEL_BANK,
                null,
                "Green Valley SACCO",
                "0101234567",
                "Centenary Bank",
                "Mukono",
                "CERBUGKA",
                "Deposit at any branch and upload the receipt.");

        account.update(
                null,
                "Green Valley SACCO Main Collection",
                "0107654321",
                "Stanbic Bank Uganda",
                "Kampala Road",
                "SBICUGKX",
                "Use your membership number as narration.",
                false);

        assertEquals("tenant_green", account.getTenantId());
        assertTrue(account.isBank());
        assertFalse(account.isMobileMoney());
        assertFalse(account.isActive());
        assertEquals("Green Valley SACCO Main Collection", account.getAccountName());
        assertEquals("0107654321", account.getAccountNumber());
        assertEquals("Stanbic Bank Uganda", account.getBankName());
        assertEquals("Kampala Road", account.getBranch());
        assertEquals("SBICUGKX", account.getSwiftCode());
        assertEquals("Use your membership number as narration.", account.getInstructions());
    }

    @Test
    void responseContainsMemberFacingPaymentDetails() {
        SaccoPaymentAccount account = new SaccoPaymentAccount(
                "paymentaccount_3",
                "tenant_green",
                SaccoPaymentAccount.CHANNEL_BANK,
                null,
                "Green Valley SACCO Collections",
                "0101234567",
                "Centenary Bank",
                "Mukono",
                "CERBUGKA",
                "Pay directly to the SACCO account.");

        SaccoPaymentAccountResponse response = SaccoPaymentAccountResponse.from(account);

        assertEquals("paymentaccount_3", response.id());
        assertEquals("tenant_green", response.tenantId());
        assertEquals(SaccoPaymentAccount.CHANNEL_BANK, response.channel());
        assertEquals("Green Valley SACCO Collections", response.accountName());
        assertEquals("0101234567", response.accountNumber());
        assertEquals("Centenary Bank", response.bankName());
        assertEquals("Pay directly to the SACCO account.", response.instructions());
        assertTrue(response.active());
        assertNotNull(response.createdAt());
        assertNotNull(response.updatedAt());
    }
}
