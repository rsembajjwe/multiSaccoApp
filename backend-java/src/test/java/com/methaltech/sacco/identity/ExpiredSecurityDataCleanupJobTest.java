package com.methaltech.sacco.identity;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.methaltech.sacco.identity.ExpiredSecurityDataCleanupJob.CleanupSummary;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Deterministic unit test for the security-data cleanup logic. Uses fake deleters (no database or
 * Mockito) to assert that each artefact type is purged at its own retention cutoff and the counts are
 * aggregated correctly.
 */
class ExpiredSecurityDataCleanupJobTest {

    private static final Duration SESSION_RETENTION = Duration.ofDays(7);
    private static final Duration MFA_RETENTION = Duration.ofDays(1);
    private static final Duration RESET_RETENTION = Duration.ofDays(3);

    @Test
    void purgesEachTypeAtItsOwnCutoffAndAggregatesCounts() {
        ExpiredSecurityDataCleanupJob job = new ExpiredSecurityDataCleanupJob(
                null, null, null, SESSION_RETENTION, MFA_RETENTION, RESET_RETENTION);
        Instant now = Instant.parse("2026-07-28T12:00:00Z");

        List<Instant> sessionCutoff = new ArrayList<>();
        List<Instant> mfaCutoff = new ArrayList<>();
        List<Instant> resetCutoff = new ArrayList<>();

        CleanupSummary summary = job.purgeAsOf(
                now,
                cutoff -> { sessionCutoff.add(cutoff); return 4; },
                cutoff -> { mfaCutoff.add(cutoff); return 9; },
                cutoff -> { resetCutoff.add(cutoff); return 2; });

        assertEquals(now.minus(SESSION_RETENTION), sessionCutoff.get(0));
        assertEquals(now.minus(MFA_RETENTION), mfaCutoff.get(0));
        assertEquals(now.minus(RESET_RETENTION), resetCutoff.get(0));

        assertEquals(4, summary.sessions());
        assertEquals(9, summary.mfaChallenges());
        assertEquals(2, summary.passwordResets());
        assertEquals(15, summary.total());
    }
}
