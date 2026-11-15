package com.methaltech.sacco.member;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.methaltech.sacco.branch.Branch;
import com.methaltech.sacco.identity.OfficialStaffAccountService;
import com.methaltech.sacco.identity.User;
import com.methaltech.sacco.security.PasswordHasher;
import com.methaltech.sacco.tenant.SaccoOfficialAssignmentRepository;
import java.util.List;
import org.junit.jupiter.api.Test;

class SaccoOfficialOnboardingServiceTest {

    private final MemberRepository memberRepository = mock(MemberRepository.class);
    private final SaccoOfficialAssignmentRepository assignmentRepository = mock(SaccoOfficialAssignmentRepository.class);
    private final OfficialStaffAccountService staffAccountService = mock(OfficialStaffAccountService.class);
    private final PasswordHasher passwordHasher = mock(PasswordHasher.class);
    private final SaccoOfficialOnboardingService service = new SaccoOfficialOnboardingService(
            memberRepository, assignmentRepository, staffAccountService, passwordHasher);

    @Test
    void createsThreeMembersAssignmentsAndStaffAccounts() {
        Branch branch = mock(Branch.class);
        User user = mock(User.class);
        when(branch.getId()).thenReturn("branch_main");
        when(user.getId()).thenReturn("user_official");
        when(memberRepository.save(any(Member.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(passwordHasher.hash(anyString())).thenReturn(new PasswordHasher.PasswordHash("hash", "salt"));
        when(staffAccountService.create(anyString(), anyString(), anyString(), any(), anyString(), anyString(), anyString()))
                .thenReturn(user);

        List<Member> members = service.onboard(
                "tenant_new", "NEWC", "Kampala", branch, validOfficials(), "platform_admin");

        assertEquals(3, members.size());
        verify(assignmentRepository, org.mockito.Mockito.times(3)).save(any());
        verify(staffAccountService, org.mockito.Mockito.times(3))
                .create(anyString(), anyString(), anyString(), any(), anyString(), anyString(), anyString());
    }

    @Test
    void rejectsOfficialWithoutReachableDeliveryContact() {
        List<SaccoOfficialOnboardingService.OfficialInput> invalid = List.of(
                new SaccoOfficialOnboardingService.OfficialInput("chairperson", "Chair", "", "", "email"),
                validOfficials().get(1),
                validOfficials().get(2));

        assertThrows(IllegalArgumentException.class, () -> service.onboard(
                "tenant_new", "NEWC", "Kampala", mock(Branch.class), invalid, "platform_admin"));
        verify(memberRepository, never()).save(any());
    }

    private List<SaccoOfficialOnboardingService.OfficialInput> validOfficials() {
        return List.of(
                new SaccoOfficialOnboardingService.OfficialInput("chairperson", "Chair", "chair@example.com", "+256700000001", "email"),
                new SaccoOfficialOnboardingService.OfficialInput("treasurer", "Treasurer", "", "+256700000002", "sms"),
                new SaccoOfficialOnboardingService.OfficialInput("secretary", "Secretary", "secretary@example.com", "+256700000003", "email"));
    }
}
