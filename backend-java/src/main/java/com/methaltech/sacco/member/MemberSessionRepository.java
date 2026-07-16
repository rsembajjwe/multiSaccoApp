package com.methaltech.sacco.member;

import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface MemberSessionRepository extends JpaRepository<MemberSession, String> {
    Optional<MemberSession> findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(String tokenHash, Instant now);
}
