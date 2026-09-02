package com.methaltech.sacco.subscription;

import com.methaltech.sacco.member.MemberRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class SubscriptionService {

    private static final int MINIMUM_BILLABLE_MEMBERS = 20;
    public static final int MINIMUM_ACTIVE_MEMBER_COVERAGE = 20;
    private static final BigDecimal PER_MEMBER_PRICE = BigDecimal.valueOf(5000);
    /** Newly registered SACCOs get this many months of free access before payment is required. */
    private static final int FREE_TRIAL_MONTHS = 1;

    private final MemberRepository memberRepository;

    SubscriptionService(MemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    public Subscription refreshBilling(Subscription subscription) {
        subscription.refreshBilling(calculateBilling((int) memberRepository.countByTenantId(subscription.getTenantId())));
        return subscription;
    }

    public Subscription createInitialSubscription(String tenantId, String packageId, boolean paid) {
        SubscriptionBilling billing = calculateBilling(0);
        return new Subscription(
                "subscription_" + UUID.randomUUID(),
                tenantId,
                packageId == null || packageId.isBlank() ? "starter" : packageId.trim(),
                paid ? "active" : "trial",
                "INV-" + UUID.randomUUID(),
                billing.amount(),
                paid ? billing.amount() : BigDecimal.ZERO,
                billing.memberCount(),
                billing.billableMembers(),
                billing.unitPrice(),
                billing.tierId(),
                billing.tierLabel(),
                billing.billingDescription(),
                paid ? LocalDate.now().plusYears(1) : LocalDate.now().plusMonths(FREE_TRIAL_MONTHS));
    }

    public SubscriptionBilling calculateBilling(int memberCount) {
        if (memberCount <= 250) {
            int billableMembers = Math.max(memberCount, MINIMUM_BILLABLE_MEMBERS);
            return new SubscriptionBilling(
                    memberCount,
                    billableMembers,
                    PER_MEMBER_PRICE,
                    "per_member",
                    "20-250 members",
                    "UGX 5,000 per member annually, minimum 20 members",
                    PER_MEMBER_PRICE.multiply(BigDecimal.valueOf(billableMembers)));
        }
        if (memberCount <= 500) {
            return fixedBilling(memberCount, 500, "starter_fixed", "251-500 members", BigDecimal.valueOf(1200000));
        }
        if (memberCount <= 1000) {
            return fixedBilling(memberCount, 1000, "growth_fixed", "501-1,000 members", BigDecimal.valueOf(2500000));
        }
        if (memberCount <= 2500) {
            return fixedBilling(memberCount, 2500, "scale_fixed", "1,001-2,500 members", BigDecimal.valueOf(5000000));
        }
        if (memberCount <= 5000) {
            return fixedBilling(memberCount, 5000, "enterprise_fixed", "2,501-5,000 members", BigDecimal.valueOf(8000000));
        }
        if (memberCount <= 10000) {
            return fixedBilling(memberCount, 10000, "enterprise_plus_fixed", "5,001-10,000 members", BigDecimal.valueOf(12000000));
        }
        return fixedBilling(memberCount, memberCount, "custom_enterprise", "Above 10,000 members", BigDecimal.ZERO);
    }

    private SubscriptionBilling fixedBilling(
            int memberCount,
            int billableMembers,
            String tierId,
            String tierLabel,
            BigDecimal amount) {
        return new SubscriptionBilling(
                memberCount,
                billableMembers,
                null,
                tierId,
                tierLabel,
                "Fixed annual tier for " + tierLabel,
                amount);
    }
}
