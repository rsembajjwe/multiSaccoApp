package com.methaltech.sacco.subscription;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "subscription_packages")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class SubscriptionPackage {

    @Id
    private String id;

    private String name;
    private BigDecimal price;

    @Column(name = "billing_period")
    private String billingPeriod;

    @Column(name = "min_members")
    private int minMembers;

    @Column(name = "member_limit")
    private int memberLimit;

    @Column(name = "tier_label")
    private String tierLabel;

    @Column(name = "user_limit")
    private int userLimit;

    @Column(name = "branch_limit")
    private int branchLimit;

    private String modules;
    private String status;

    void update(
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
        this.name = name.trim();
        this.price = price;
        this.billingPeriod = billingPeriod;
        this.minMembers = minMembers;
        this.memberLimit = memberLimit;
        this.tierLabel = tierLabel.trim();
        this.userLimit = userLimit;
        this.branchLimit = branchLimit;
        this.modules = modules.trim();
        this.status = status;
    }
}
