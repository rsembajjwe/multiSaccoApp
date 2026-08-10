package com.methaltech.sacco.identity;

import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface MfaChallengeRepository extends JpaRepository<MfaChallenge, String> {
    Optional<MfaChallenge> findByIdAndStatusAndExpiresAtAfter(String id, String status, Instant now);

    // Housekeeping: remove MFA challenges that expired before the given cutoff.
    long deleteByExpiresAtBefore(Instant cutoff);
}
