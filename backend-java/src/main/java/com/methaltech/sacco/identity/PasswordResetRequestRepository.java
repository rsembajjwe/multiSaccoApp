package com.methaltech.sacco.identity;

import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface PasswordResetRequestRepository extends JpaRepository<PasswordResetRequest, String> {
    Optional<PasswordResetRequest> findByTokenHashAndStatusAndExpiresAtAfter(String tokenHash, String status, Instant now);
}
