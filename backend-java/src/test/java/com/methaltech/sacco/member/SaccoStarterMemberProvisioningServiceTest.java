package com.methaltech.sacco.member;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.methaltech.sacco.branch.Branch;
import com.methaltech.sacco.branch.DefaultBranchProvisioningService;
import com.methaltech.sacco.security.PasswordHasher;
import java.util.List;
import org.junit.jupiter.api.Test;

class SaccoStarterMemberProvisioningServiceTest {

    @Test
    void provisionsThreeVerifiedMembersAfterTheHighestMembershipNumber() {
        MemberRepository memberRepository = mock(MemberRepository.class);
        DefaultBranchProvisioningService branchService = mock(DefaultBranchProvisioningService.class);
        Branch branch = mock(Branch.class);
        Member existing = mock(Member.class);
        when(branch.getId()).thenReturn("branch_main");
        when(branchService.ensureMainBranch("tenant_new", "az", "Kampala", "creator")).thenReturn(branch);
        when(existing.getMembershipNo()).thenReturn("AZ-0007");
        when(memberRepository.findByTenantIdOrderByMembershipNoAsc("tenant_new")).thenReturn(List.of(existing));
        when(memberRepository.count()).thenReturn(20L);
        when(memberRepository.existsByTenantIdAndMembershipNoIgnoreCase(any(), any())).thenReturn(false);
        when(memberRepository.save(any(Member.class))).thenAnswer(invocation -> invocation.getArgument(0));

        List<Member> created = new SaccoStarterMemberProvisioningService(
                memberRepository, branchService, new PasswordHasher())
                .provisionStarterMembers("tenant_new", "az", "Kampala", "creator");

        assertEquals(List.of("AZ-0008", "AZ-0009", "AZ-0010"),
                created.stream().map(Member::getMembershipNo).toList());
        assertTrue(created.stream().allMatch(member -> "active".equals(member.getStatus())));
        assertTrue(created.stream().allMatch(member -> "verified".equals(member.getKycStatus())));
        assertTrue(created.stream().allMatch(member -> "branch_main".equals(member.getBranchId())));
    }
}
