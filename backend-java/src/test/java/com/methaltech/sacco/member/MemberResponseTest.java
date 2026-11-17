package com.methaltech.sacco.member;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class MemberResponseTest {

    @Test
    void summaryIncludesOutstandingBalanceAndAggregateLoanStatus() {
        Member member = mock(Member.class);
        when(member.getId()).thenReturn("member-1");
        when(member.getSavingsBalance()).thenReturn(new BigDecimal("450000"));
        when(member.getSharesBalance()).thenReturn(BigDecimal.ZERO);
        when(member.getWelfareBalance()).thenReturn(BigDecimal.ZERO);

        MemberResponse response = MemberResponse.fromSummary(
                member, new BigDecimal("125000"), "overdue", true);

        assertEquals(new BigDecimal("450000"), response.savingsBalance());
        assertEquals(new BigDecimal("125000"), response.loanBalance());
        assertEquals("overdue", response.loanStatus());
    }
}
