package com.methaltech.sacco.member;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.methaltech.sacco.api.ApiErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
class MemberAppSubscriptionInterceptor implements HandlerInterceptor {

    private final MemberAuthService memberAuthService;
    private final MemberSubscriptionService memberSubscriptionService;
    private final ObjectMapper objectMapper;

    MemberAppSubscriptionInterceptor(
            MemberAuthService memberAuthService,
            MemberSubscriptionService memberSubscriptionService,
            ObjectMapper objectMapper) {
        this.memberAuthService = memberAuthService;
        this.memberSubscriptionService = memberSubscriptionService;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String path = request.getRequestURI();
        if (isSubscriptionAccessPath(path)) {
            return true;
        }
        MemberAuthService.CurrentMemberSession session = memberAuthService.currentSession(request.getHeader("Authorization"));
        if (session == null) {
            return true;
        }
        MemberSubscriptionService.MemberAppAccess access = memberSubscriptionService.accessFor(session.member());
        if (access.allowed()) {
            return true;
        }
        response.setStatus(HttpServletResponse.SC_PAYMENT_REQUIRED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(
                response.getOutputStream(),
                ApiErrorResponse.of(HttpServletResponse.SC_PAYMENT_REQUIRED, access.code(), access.message()));
        return false;
    }

    private boolean isSubscriptionAccessPath(String path) {
        return path.endsWith("/login")
                || path.endsWith("/logout")
                || path.endsWith("/membership")
                || path.contains("/password-reset/")
                || path.contains("/activation-")
                || path.endsWith("/me")
                || path.endsWith("/session/extend");
    }
}
