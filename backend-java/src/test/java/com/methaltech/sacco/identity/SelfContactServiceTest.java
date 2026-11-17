package com.methaltech.sacco.identity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class SelfContactServiceTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final MemberRepository memberRepository = mock(MemberRepository.class);
    private final SelfContactService service = new SelfContactService(userRepository, memberRepository);

    @Test
    void normalizesContactAndSynchronizesLinkedOfficialMember() {
        User user = user();
        Member member = mock(Member.class);
        when(userRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(memberRepository.findFirstByLinkedUserId(user.getId())).thenReturn(Optional.of(member));
        when(member.getTenantId()).thenReturn(user.getTenantId());
        when(member.getId()).thenReturn("member_one");
        when(member.getWhatsapp()).thenReturn("+256700000099");

        User saved = service.update(user, " NEW@Example.COM ", "0700123456");

        assertEquals("new@example.com", saved.getEmail());
        assertEquals("+256700123456", saved.getPhone());
        verify(member).updateContact("+256700123456", "+256700000099", "new@example.com");
        verify(memberRepository).save(member);
    }

    @Test
    void rejectsDuplicateTenantContactAndClearsChangedVerification() {
        User user = user();
        user.beginOnboarding("email");
        user.verifyOnboardingContact();
        when(userRepository.existsByTenantIdAndIdNotAndEmailIgnoreCase(
                user.getTenantId(), user.getId(), "taken@example.com")).thenReturn(true);

        SelfContactService.ContactUpdateException duplicate = assertThrows(
                SelfContactService.ContactUpdateException.class,
                () -> service.update(user, "taken@example.com", "+256700123456"));
        assertEquals("EMAIL_IN_USE", duplicate.code());

        when(userRepository.existsByTenantIdAndIdNotAndEmailIgnoreCase(
                user.getTenantId(), user.getId(), "new@example.com")).thenReturn(false);
        when(userRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(memberRepository.findFirstByLinkedUserId(user.getId())).thenReturn(Optional.empty());
        service.update(user, "new@example.com", "+256700123456");
        assertFalse(user.isEmailVerified());
    }

    private User user() {
        return new User(
                "user_one",
                "tenant_one",
                "Test User",
                "old@example.com",
                "+256700000001",
                "hash",
                "salt",
                "active");
    }
}
