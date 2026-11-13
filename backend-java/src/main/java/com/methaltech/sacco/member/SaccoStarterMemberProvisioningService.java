package com.methaltech.sacco.member;

import com.methaltech.sacco.branch.Branch;
import com.methaltech.sacco.branch.DefaultBranchProvisioningService;
import com.methaltech.sacco.security.PasswordHasher;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Provisions three starter members (and a main branch) for a freshly created SACCO so its SACCO officials
 * panel can be filled in immediately after creation. The members are active, verified, and ready to be
 * assigned to the chairperson/secretary/treasurer offices.
 *
 * <p>This is a convenience for demo and testing environments. The caller gates it (behind demo logins) so a
 * real production SACCO is never populated with placeholder members. Lives in the member package to reach
 * the package-private {@link Member} constructor.
 */
@Service
public class SaccoStarterMemberProvisioningService {

    private static final List<String> STARTER_NAMES = List.of("Sarah Nakimuli", "Daniel Mugisha", "Grace Atim");
    private static final String STARTER_PASSWORD = "Member@12345";

    private final MemberRepository memberRepository;
    private final DefaultBranchProvisioningService branchProvisioningService;
    private final PasswordHasher passwordHasher;

    public SaccoStarterMemberProvisioningService(
            MemberRepository memberRepository,
            DefaultBranchProvisioningService branchProvisioningService,
            PasswordHasher passwordHasher) {
        this.memberRepository = memberRepository;
        this.branchProvisioningService = branchProvisioningService;
        this.passwordHasher = passwordHasher;
    }

    /**
     * Create three starter members for the tenant. Idempotent-ish: membership numbers continue from the
     * highest used numeric suffix, and any number that already exists is skipped, so re-running never
     * duplicates even when prior memberships have gaps.
     *
     * @return the members created (may be fewer than three if some numbers were already taken)
     */
    @Transactional
    public List<Member> provisionStarterMembers(String tenantId, String saccoCode, String address, String createdByUserId) {
        Branch branch = branchProvisioningService.ensureMainBranch(tenantId, saccoCode, address, createdByUserId);
        String abbreviation = saccoCode == null || saccoCode.isBlank() ? "SACCO" : saccoCode.trim().toUpperCase(Locale.ROOT);
        long next = nextMembershipSequence(tenantId, abbreviation);
        long phoneBase = memberRepository.count();

        List<Member> created = new ArrayList<>();
        for (int i = 0; i < STARTER_NAMES.size(); i++) {
            String membershipNo = nextMembershipNo(tenantId, abbreviation, next++);
            String phone = "+256709" + String.format("%06d", (phoneBase + i) % 1_000_000L);
            String email = membershipNo.toLowerCase(Locale.ROOT) + "@starter.local";
            String nationalId = "SM" + membershipNo.replace("-", "");
            PasswordHasher.PasswordHash password = passwordHasher.hash(STARTER_PASSWORD);

            Member member = memberRepository.save(new Member(
                    "member_" + UUID.randomUUID(),
                    tenantId,
                    branch.getId(),
                    membershipNo,
                    STARTER_NAMES.get(i),
                    "individual",
                    phone,
                    email,
                    address,
                    nationalId,
                    password.hash(),
                    password.salt(),
                    "active",
                    "verified",
                    LocalDate.now()));
            created.add(member);
        }
        return created;
    }

    private long nextMembershipSequence(String tenantId, String abbreviation) {
        String prefix = abbreviation + "-";
        return memberRepository.findByTenantIdOrderByMembershipNoAsc(tenantId).stream()
                .map(Member::getMembershipNo)
                .filter(membershipNo -> membershipNo != null && membershipNo.toUpperCase(Locale.ROOT).startsWith(prefix))
                .map(membershipNo -> membershipNo.substring(prefix.length()))
                .filter(suffix -> suffix.matches("\\d+"))
                .mapToLong(Long::parseLong)
                .max()
                .orElse(0L) + 1;
    }

    private String nextMembershipNo(String tenantId, String abbreviation, long sequence) {
        String membershipNo;
        do {
            membershipNo = abbreviation + "-" + String.format("%04d", sequence++);
        } while (memberRepository.existsByTenantIdAndMembershipNoIgnoreCase(tenantId, membershipNo));
        return membershipNo;
    }
}
