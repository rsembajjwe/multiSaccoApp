package com.methaltech.sacco.subscription;

import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberRepository;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class SubscriptionAccessService {

    private final SubscriptionRepository subscriptionRepository;
    private final MemberRepository memberRepository;

    SubscriptionAccessService(SubscriptionRepository subscriptionRepository, MemberRepository memberRepository) {
        this.subscriptionRepository = subscriptionRepository;
        this.memberRepository = memberRepository;
    }

    public MemberDepositAccess memberDepositAccess(Member member) {
        Subscription subscription = subscriptionRepository.findFirstByTenantIdOrderByCreatedAtDesc(member.getTenantId()).orElse(null);
        if (subscription == null) {
            return MemberDepositAccess.blocked("NO_PLATFORM_SUBSCRIPTION", "This SACCO has no active platform subscription.");
        }
        if ("trial".equals(subscription.getStatus())) {
            return MemberDepositAccess.blocked("SACCO_TRIAL_SETUP_ONLY",
                    "This SACCO is on setup trial. Configuration is allowed, but member deposits are blocked until subscription payment activates access.");
        }
        if (!"active".equals(subscription.getStatus())) {
            return MemberDepositAccess.blocked("SACCO_SUBSCRIPTION_NOT_ACTIVE",
                    "This SACCO subscription is not active for member deposits.");
        }
        int coveredMembers = coveredMembers(subscription);
        if (coveredMembers <= 0) {
            return MemberDepositAccess.blocked("NO_PAID_MEMBER_CAPACITY",
                    "No paid member capacity is available for deposits.");
        }
        int memberPosition = memberPosition(member);
        if (memberPosition > coveredMembers) {
            return MemberDepositAccess.blocked("MEMBER_NOT_WITHIN_PAID_CAPACITY",
                    "This member is visible, but deposits are blocked until the SACCO pays for more active member capacity.");
        }
        return MemberDepositAccess.allowed(coveredMembers, memberPosition);
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

    private int memberPosition(Member member) {
        // Not-active members never appear in the paid-capacity ordering.
        if (!"active".equals(member.getStatus())) {
            return Integer.MAX_VALUE;
        }
        String membershipNo = member.getMembershipNo();
        // Membership numbers are unique per tenant, so a member's 1-based rank is
        // exactly the number of active members ordered before it, plus one. This
        // avoids loading and sorting every member on each deposit-access check.
        // Null membership numbers sort last (Comparator.nullsLast); fall back to
        // the exact scan for that rare case.
        if (membershipNo == null) {
            return memberPositionByScan(member);
        }
        long before = memberRepository.countActiveMembersOrderedBefore(member.getTenantId(), membershipNo);
        long position = before + 1;
        return position >= Integer.MAX_VALUE ? Integer.MAX_VALUE : (int) position;
    }

    private int memberPositionByScan(Member member) {
        List<Member> members = memberRepository.findByTenantIdOrderByMembershipNoAsc(member.getTenantId()).stream()
                .filter(candidate -> "active".equals(candidate.getStatus()))
                .sorted(Comparator.comparing(Member::getMembershipNo, Comparator.nullsLast(String::compareToIgnoreCase)))
                .toList();
        for (int index = 0; index < members.size(); index += 1) {
            if (members.get(index).getId().equals(member.getId())) return index + 1;
        }
        return Integer.MAX_VALUE;
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
