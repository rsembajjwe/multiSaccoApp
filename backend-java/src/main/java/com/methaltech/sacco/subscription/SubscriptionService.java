package com.methaltech.sacco.subscription;

import com.methaltech.sacco.member.MemberRepository;
import java.math.BigDecimal;
import org.springframework.stereotype.Service;

@Service
class SubscriptionService {

    private static final int MINIMUM_BILLABLE_MEMBERS = 100;
    private static final BigDecimal PER_MEMBER_PRICE = BigDecimal.valueOf(5000);

    private final MemberRepository memberRepository;

    SubscriptionService(MemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    Subscription refreshBilling(Subscription subscription) {
        subscription.refreshBilling(calculateBilling((int) memberRepository.countByTenantId(subscription.getTenantId())));
        return subscription;
    }

    SubscriptionBilling calculateBilling(int memberCount) {
        if (memberCount <= 250) {
            int billableMembers = Math.max(memberCount, MINIMUM_BILLABLE_MEMBERS);
            return new SubscriptionBilling(
                    memberCount,
                    billableMembers,
                    PER_MEMBER_PRICE,
                    "per_member",
                    "100-250 members",
                    "UGX 5,000 per member annually, minimum 100 members",
                    PER_MEMBER_PRICE.multiply(BigDecimal.valueOf(billableMembers)));
        }
        if (memberCount <= 500) {
            return fixedBilling(memberCount, 500, "starter_fixed", "251-500 members", BigDecimal.valueOf(1200000));
        }
        if (memberCount <= 2500) {
            return fixedBilling(memberCount, 2500, "growth_fixed", "501-2,500 members", BigDecimal.valueOf(3600000));
        }
        return fixedBilling(memberCount, 10000, "enterprise_fixed", "2,501-10,000 members", BigDecimal.valueOf(9000000));
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
