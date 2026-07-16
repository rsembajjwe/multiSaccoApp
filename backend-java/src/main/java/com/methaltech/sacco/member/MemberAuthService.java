package com.methaltech.sacco.member;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.security.TokenGenerator;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

@Service
class MemberAuthService {

    private final MemberRepository memberRepository;
    private final MemberSessionRepository memberSessionRepository;
    private final TokenGenerator tokenGenerator;

    MemberAuthService(
            MemberRepository memberRepository,
            MemberSessionRepository memberSessionRepository,
            TokenGenerator tokenGenerator) {
        this.memberRepository = memberRepository;
        this.memberSessionRepository = memberSessionRepository;
        this.tokenGenerator = tokenGenerator;
    }

    CurrentMemberSession currentSession(String authorization) {
        String token = bearerToken(authorization);
        if (token == null) return null;
        return memberSessionRepository
                .findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(tokenGenerator.hashToken(token), Instant.now())
                .flatMap(session -> memberRepository.findById(session.getMemberId())
                        .filter(member -> "active".equals(member.getStatus()))
                        .map(member -> new CurrentMemberSession(session, member)))
                .orElse(null);
    }

    ResponseEntity<ApiErrorResponse> authRequired() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiErrorResponse.of(401, "MEMBER_AUTH_REQUIRED", "A valid member bearer token is required."));
    }

    private String bearerToken(String authorization) {
        if (authorization == null || !authorization.toLowerCase().startsWith("bearer ")) return null;
        String token = authorization.substring(7).trim();
        return token.isBlank() ? null : token;
    }

    record CurrentMemberSession(MemberSession session, Member member) {
    }
}
