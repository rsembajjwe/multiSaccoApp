package com.methaltech.sacco.accounting;

import java.time.Instant;

record MobileMoneyProviderStatusResult(
        String status,
        String statusMessage,
        String providerReference,
        String providerStatus,
        boolean callbackPosting,
        Instant checkedAt) {
}
