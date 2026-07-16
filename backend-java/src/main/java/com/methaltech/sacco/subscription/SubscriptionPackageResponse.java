package com.methaltech.sacco.subscription;

import java.math.BigDecimal;

record SubscriptionPackageResponse(
        String id,
        String name,
        BigDecimal price,
        String billingPeriod,
        int minMembers,
        int memberLimit,
        String tierLabel,
        int userLimit,
        int branchLimit,
        String modules,
        String status) {

    static SubscriptionPackageResponse from(SubscriptionPackage subscriptionPackage) {
        return new SubscriptionPackageResponse(
                subscriptionPackage.getId(),
                subscriptionPackage.getName(),
                subscriptionPackage.getPrice(),
                subscriptionPackage.getBillingPeriod(),
                subscriptionPackage.getMinMembers(),
                subscriptionPackage.getMemberLimit(),
                subscriptionPackage.getTierLabel(),
                subscriptionPackage.getUserLimit(),
                subscriptionPackage.getBranchLimit(),
                subscriptionPackage.getModules(),
                subscriptionPackage.getStatus());
    }
}
