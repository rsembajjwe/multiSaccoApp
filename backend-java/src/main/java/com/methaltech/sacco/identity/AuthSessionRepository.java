package com.methaltech.sacco.identity;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface AuthSessionRepository extends JpaRepository<AuthSession, String> {
    Optional<AuthSession> findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(String tokenHash, Instant now);
    List<AuthSession> findByUserIdAndRevokedAtIsNull(String userId);
}
