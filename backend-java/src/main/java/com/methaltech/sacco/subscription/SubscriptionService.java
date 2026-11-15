package com.methaltech.sacco.subscription;

import com.methaltech.sacco.member.MemberRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class SubscriptionService {

    public static final int MINIMUM_ACTIVE_MEMBER_COVERAGE = 1;
    private static final BigDecimal PER_MEMBER_PRICE = BigDecimal.valueOf(5000);
    /** Newly registered SACCOs get this many months of free access before payment is required. */
    private static final int FREE_TRIAL_MONTHS = 1;

    private final MemberRepository memberRepository;
    private final SubscriptionPackageRepository packageRepository;

    SubscriptionService(MemberRepository memberRepository, SubscriptionPackageRepository packageRepository) {
        this.memberRepository = memberRepository;
        this.packageRepository = packageRepository;
    }

    public Subscription refreshBilling(Subscription subscription) {
        subscription.refreshBilling(calculateBilling(
                subscription.getPackageId(),
                (int) memberRepository.countByTenantId(subscription.getTenantId())));
        return subscription;
    }

    public Subscription createInitialSubscription(String tenantId, String packageId, boolean paid) {
        String selectedPackageId = packageId == null || packageId.isBlank() ? "community" : packageId.trim();
        SubscriptionBilling billing = calculateBilling(selectedPackageId, 0);
        return new Subscription(
                "subscription_" + UUID.randomUUID(),
                tenantId,
                selectedPackageId,
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
            int billableMembers = Math.max(memberCount, 0);
            return new SubscriptionBilling(
                    memberCount,
                    billableMembers,
                    PER_MEMBER_PRICE,
                    "per_member",
                    "Up to 250 members",
                    "UGX 5,000 per registered member annually",
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

    public SubscriptionBilling calculateBilling(String packageId, int memberCount) {
        String selectedPackageId = packageId == null || packageId.isBlank() ? "community" : packageId.trim();
        SubscriptionPackage configured = packageRepository.findById(selectedPackageId).orElse(null);
        if (configured != null) {
            if ("community".equals(configured.getId())) {
                return perMemberBilling(memberCount, configured.getPrice(), configured.getTierLabel());
            }
            return fixedBilling(memberCount, configured.getMemberLimit(), configured.getId() + "_fixed",
                    configured.getTierLabel(), configured.getPrice());
        }
        return fallbackBilling(selectedPackageId, memberCount);
    }

    public boolean requiresFullPayment(Subscription subscription) {
        return subscription.getUnitPrice() == null && subscription.getAmount().compareTo(BigDecimal.ZERO) > 0;
    }

    private SubscriptionBilling perMemberBilling(int memberCount) {
        return perMemberBilling(memberCount, PER_MEMBER_PRICE, "Up to 250 members");
    }

    private SubscriptionBilling perMemberBilling(int memberCount, BigDecimal unitPrice, String tierLabel) {
        int billableMembers = Math.max(memberCount, 0);
        return new SubscriptionBilling(
                memberCount,
                billableMembers,
                unitPrice,
                "per_member",
                tierLabel,
                "UGX " + unitPrice.stripTrailingZeros().toPlainString() + " per registered member annually",
                unitPrice.multiply(BigDecimal.valueOf(billableMembers)));
    }

    private SubscriptionBilling fallbackBilling(String packageId, int memberCount) {
        return switch (packageId) {
            case "starter" -> fixedBilling(memberCount, 500, "starter_fixed", "251-500 members", BigDecimal.valueOf(1200000));
            case "growth" -> fixedBilling(memberCount, 1000, "growth_fixed", "501-1,000 members", BigDecimal.valueOf(2500000));
            case "scale" -> fixedBilling(memberCount, 2500, "scale_fixed", "1,001-2,500 members", BigDecimal.valueOf(5000000));
            case "enterprise_5000" -> fixedBilling(memberCount, 5000, "enterprise_fixed", "2,501-5,000 members", BigDecimal.valueOf(8000000));
            case "enterprise" -> fixedBilling(memberCount, 10000, "enterprise_plus_fixed", "5,001-10,000 members", BigDecimal.valueOf(12000000));
            default -> perMemberBilling(memberCount);
        };
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
