package com.methaltech.sacco.member;

import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberPasswordResetRequestRepository extends JpaRepository<MemberPasswordResetRequest, String> {

    /** Finds a usable reset by its raw code (single-use, must be activated and unexpired). */
    Optional<MemberPasswordResetRequest> findFirstByTokenAndStatusAndExpiresAtAfter(String token, String status, Instant now);

    /** Finds a reset awaiting SMS-fee payment by its external reference, for callback activation. */
    Optional<MemberPasswordResetRequest> findFirstByTenantIdAndExternalReferenceAndStatus(String tenantId, String externalReference, String status);
}
