package com.methaltech.sacco.member;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import tools.jackson.databind.ObjectMapper;

class MemberAppSubscriptionInterceptorTest {

    @Test
    void disabledEnforcementLeavesUnrelatedIntegrationScenariosUnaffected() throws Exception {
        MemberAuthService authService = mock(MemberAuthService.class);
        MemberSubscriptionService subscriptionService = mock(MemberSubscriptionService.class);
        MemberAppSubscriptionInterceptor interceptor = new MemberAppSubscriptionInterceptor(
                authService, subscriptionService, new ObjectMapper(), false);

        boolean allowed = interceptor.preHandle(
                memberRequest("/api/v1/member-auth/mobile-dashboard"),
                new MockHttpServletResponse(),
                new Object());

        assertTrue(allowed);
        verifyNoInteractions(authService, subscriptionService);
    }

    @Test
    void enabledEnforcementReturnsPaymentRequiredForUnpaidMember() throws Exception {
        MemberAuthService authService = mock(MemberAuthService.class);
        MemberSubscriptionService subscriptionService = mock(MemberSubscriptionService.class);
        Member member = mock(Member.class);
        when(authService.currentSession("Bearer member-token"))
                .thenReturn(new MemberAuthService.CurrentMemberSession(null, member));
        when(subscriptionService.accessFor(member)).thenReturn(new MemberSubscriptionService.MemberAppAccess(
                false,
                "MEMBER_APP_SUBSCRIPTION_REQUIRED",
                "Payment required.",
                null));
        MemberAppSubscriptionInterceptor interceptor = new MemberAppSubscriptionInterceptor(
                authService, subscriptionService, new ObjectMapper(), true);
        MockHttpServletResponse response = new MockHttpServletResponse();

        boolean allowed = interceptor.preHandle(
                memberRequest("/api/v1/member-auth/mobile-dashboard"),
                response,
                new Object());

        assertFalse(allowed);
        org.junit.jupiter.api.Assertions.assertEquals(402, response.getStatus());
        org.junit.jupiter.api.Assertions.assertTrue(response.getContentAsString().contains("MEMBER_APP_SUBSCRIPTION_REQUIRED"));
    }

    private MockHttpServletRequest memberRequest(String path) {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", path);
        request.addHeader("Authorization", "Bearer member-token");
        return request;
    }
}
