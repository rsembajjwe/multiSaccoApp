package com.methaltech.sacco.subscription;

record SubscriptionPaymentResult(
        SubscriptionResponse subscription,
        SubscriptionPaymentResponse payment,
        boolean idempotent) {
}
