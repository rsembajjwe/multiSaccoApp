package com.methaltech.sacco.subscription;

import com.methaltech.sacco.member.Member;
import java.time.LocalDate;
import org.springframework.stereotype.Service;

@Service
public class SubscriptionAccessService {

    private final SubscriptionRepository subscriptionRepository;

    SubscriptionAccessService(SubscriptionRepository subscriptionRepository) {
        this.subscriptionRepository = subscriptionRepository;
    }

    public MemberDepositAccess memberDepositAccess(Member member) {
        return memberDataAccess(member);
    }

    public MemberDepositAccess memberDataAccess(Member member) {
        Subscription subscription = subscriptionRepository.findFirstByTenantIdOrderByCreatedAtDesc(member.getTenantId()).orElse(null);
        if (subscription == null) {
            return MemberDepositAccess.blocked("NO_PLATFORM_SUBSCRIPTION", "This SACCO has no active platform subscription.");
        }
        if (subscription.getExpiry() != null && subscription.getExpiry().isBefore(LocalDate.now())) {
            return MemberDepositAccess.blocked("SACCO_SUBSCRIPTION_EXPIRED",
                    "This SACCO subscription has expired. Payment or an approved extension is required.");
        }
        if ("trial".equals(subscription.getStatus())) {
            return MemberDepositAccess.allowed(subscription.getMemberCount(), 0);
        }
        if (!"active".equals(subscription.getStatus())) {
            return MemberDepositAccess.blocked("SACCO_SUBSCRIPTION_NOT_ACTIVE",
                    "This SACCO subscription is not active.");
        }
        return MemberDepositAccess.allowed(subscription.getMemberCount(), 0);
    }

    public int coveredMembers(Subscription subscription) {
        if ("trial".equals(subscription.getStatus())) return 0;
        return subscription.paidMemberCapacity();
    }

    public Subscription activateTrialIfCovered(Subscription subscription, LocalDate activeExpiry) {
        if (subscription != null
                && "trial".equals(subscription.getStatus())
                && coveredMembers(subscription) >= SubscriptionService.MINIMUM_ACTIVE_MEMBER_COVERAGE) {
            subscription.activateFromTrial(activeExpiry);
        }
        return subscription;
    }

    public record MemberDepositAccess(boolean allowed, String code, String message, int coveredMembers, int memberPosition) {
        static MemberDepositAccess allowed(int coveredMembers, int memberPosition) {
            return new MemberDepositAccess(true, "", "", coveredMembers, memberPosition);
        }

        static MemberDepositAccess blocked(String code, String message) {
            return new MemberDepositAccess(false, code, message, 0, 0);
        }
    }
}
