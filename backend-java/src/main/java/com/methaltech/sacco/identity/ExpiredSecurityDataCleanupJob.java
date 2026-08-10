package com.methaltech.sacco.identity;

import java.time.Duration;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Periodically purges expired, unusable security artefacts so their tables do not grow without bound:
 * expired login sessions, expired MFA challenges, and expired password-reset requests. Each type has
 * its own retention (a short grace period after expiry, useful for forensic review). All values are
 * configurable; the job is idempotent and safe to run repeatedly.
 */
@Component
class ExpiredSecurityDataCleanupJob {

    private static final Logger log = LoggerFactory.getLogger(ExpiredSecurityDataCleanupJob.class);

    private final AuthSessionRepository sessionRepository;
    private final MfaChallengeRepository mfaChallengeRepository;
    private final PasswordResetRequestRepository passwordResetRequestRepository;
    private final Duration sessionRetention;
    private final Duration mfaRetention;
    private final Duration passwordResetRetention;

    ExpiredSecurityDataCleanupJob(
            AuthSessionRepository sessionRepository,
            MfaChallengeRepository mfaChallengeRepository,
            PasswordResetRequestRepository passwordResetRequestRepository,
            @Value("${sacco.cleanup.session-retention:7d}") Duration sessionRetention,
            @Value("${sacco.cleanup.mfa-retention:1d}") Duration mfaRetention,
            @Value("${sacco.cleanup.password-reset-retention:7d}") Duration passwordResetRetention) {
        this.sessionRepository = sessionRepository;
        this.mfaChallengeRepository = mfaChallengeRepository;
        this.passwordResetRequestRepository = passwordResetRequestRepository;
        this.sessionRetention = sessionRetention;
        this.mfaRetention = mfaRetention;
        this.passwordResetRetention = passwordResetRetention;
    }

    @Scheduled(cron = "${sacco.cleanup.cron:0 30 3 * * *}")
    @Transactional
    public void purgeExpiredSecurityData() {
        CleanupSummary summary = purgeAsOf(
                Instant.now(),
                sessionRepository::deleteByExpiresAtBefore,
                mfaChallengeRepository::deleteByExpiresAtBefore,
                passwordResetRequestRepository::deleteByExpiresAtBefore);
        if (summary.total() > 0) {
            log.info("Purged expired security data: sessions={}, mfaChallenges={}, passwordResets={}",
                    summary.sessions(), summary.mfaChallenges(), summary.passwordResets());
        }
    }

    /**
     * Pure cleanup logic: computes the per-type cutoff (now minus retention) and invokes each deleter.
     * Extracted so it can be tested deterministically without a database.
     */
    CleanupSummary purgeAsOf(Instant now, Deleter sessionDeleter, Deleter mfaDeleter, Deleter passwordResetDeleter) {
        long sessions = sessionDeleter.deleteExpiredBefore(now.minus(sessionRetention));
        long mfaChallenges = mfaDeleter.deleteExpiredBefore(now.minus(mfaRetention));
        long passwordResets = passwordResetDeleter.deleteExpiredBefore(now.minus(passwordResetRetention));
        return new CleanupSummary(sessions, mfaChallenges, passwordResets);
    }

    @FunctionalInterface
    interface Deleter {
        long deleteExpiredBefore(Instant cutoff);
    }

    record CleanupSummary(long sessions, long mfaChallenges, long passwordResets) {
        long total() {
            return sessions + mfaChallenges + passwordResets;
        }
    }
}
