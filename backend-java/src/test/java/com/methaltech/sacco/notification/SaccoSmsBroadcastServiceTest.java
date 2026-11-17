package com.methaltech.sacco.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.methaltech.sacco.loan.Loan;
import com.methaltech.sacco.loan.LoanRepository;
import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberRepository;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class SaccoSmsBroadcastServiceTest {

    private final MemberRepository memberRepository = mock(MemberRepository.class);
    private final LoanRepository loanRepository = mock(LoanRepository.class);
    private final SmsWalletService walletService = mock(SmsWalletService.class);
    private final NotificationService notificationService = mock(NotificationService.class);
    private final SaccoSmsBroadcastService service = new SaccoSmsBroadcastService(
            memberRepository, loanRepository, walletService, notificationService);

    @Test
    void accountStatusMessagesArePersonalizedAndCostedPerMember() {
        Member member = member();
        Loan loan = mock(Loan.class);
        when(loan.getMemberId()).thenReturn("member_one");
        when(loan.getBalance()).thenReturn(BigDecimal.valueOf(45000));
        when(memberRepository.findByTenantIdOrderByMembershipNoAsc("tenant_one")).thenReturn(List.of(member));
        when(loanRepository.findByMemberIdInAndStatusIn(eq(List.of("member_one")), any())).thenReturn(List.of(loan));
        when(walletService.balance("tenant_one")).thenReturn(20);

        SaccoSmsBroadcastService.Preview preview = service.preview(
                "tenant_one", List.of(), "account_status", "Your monthly update.");

        String message = preview.messages().get("member_one");
        assertTrue(message.contains("Amina Member"));
        assertTrue(message.contains("Savings: UGX 100000"));
        assertTrue(message.contains("Loan balance: UGX 45000"));
        assertTrue(preview.requiredCredits() >= 1);
    }

    @Test
    void sendDebitsSaccoWalletAndReturnsRemainingBalance() {
        Member member = member();
        Notification notification = mock(Notification.class);
        when(memberRepository.findByTenantIdOrderByMembershipNoAsc("tenant_one")).thenReturn(List.of(member));
        when(walletService.balance("tenant_one")).thenReturn(9);
        when(notificationService.notifySmsBroadcast("tenant_one", List.of(member), "Notice", "Hello"))
                .thenReturn(List.of(notification));

        SaccoSmsBroadcastService.SendResult result = service.send(
                "tenant_one", List.of(), "custom", "Notice", "Hello");

        assertEquals(1, result.recipients());
        assertEquals(1, result.creditsUsed());
        assertEquals(9, result.smsBalance());
        verify(walletService).debit(eq("tenant_one"), eq(1), any(), eq("SACCO SMS broadcast"));
    }

    @Test
    void sendRejectsAnAudienceWithoutPhoneNumbers() {
        when(memberRepository.findByTenantIdOrderByMembershipNoAsc("tenant_one")).thenReturn(List.of());
        when(walletService.balance("tenant_one")).thenReturn(9);

        assertThrows(IllegalArgumentException.class, () -> service.send(
                "tenant_one", List.of(), "custom", "Notice", "Hello"));
    }

    private Member member() {
        Member member = mock(Member.class);
        when(member.getId()).thenReturn("member_one");
        when(member.getTenantId()).thenReturn("tenant_one");
        when(member.getPhone()).thenReturn("+256700000001");
        when(member.getFullName()).thenReturn("Amina Member");
        when(member.getStatus()).thenReturn("active");
        when(member.getSavingsBalance()).thenReturn(BigDecimal.valueOf(100000));
        return member;
    }
}
