package com.methaltech.sacco.config;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class ScaleReadinessValidatorTest {

    @Test
    void demoModeAllowsSingleNodeDefaults() {
        ScaleReadinessValidator validator = new ScaleReadinessValidator(true, 1, "memory", "");

        assertDoesNotThrow(validator::validate);
    }

    @Test
    void productionAllowsSingleNodeMemoryLimiter() {
        ScaleReadinessValidator validator = new ScaleReadinessValidator(false, 1, "memory", "");

        assertDoesNotThrow(validator::validate);
    }

    @Test
    void productionRejectsInvalidInstanceCount() {
        ScaleReadinessValidator validator = new ScaleReadinessValidator(false, 0, "memory", "");

        IllegalStateException error = assertThrows(IllegalStateException.class, validator::validate);

        assertTrue(error.getMessage().contains("SACCO_EXPECTED_BACKEND_INSTANCES"));
    }

    @Test
    void productionRejectsMultiInstanceWithoutRedisStore() {
        ScaleReadinessValidator validator = new ScaleReadinessValidator(false, 2, "memory", "redis://cache:6379");

        IllegalStateException error = assertThrows(IllegalStateException.class, validator::validate);

        assertTrue(error.getMessage().contains("SACCO_RATE_LIMIT_STORE=redis"));
    }

    @Test
    void productionRejectsMultiInstanceWithoutRedisUrl() {
        ScaleReadinessValidator validator = new ScaleReadinessValidator(false, 2, "redis", "");

        IllegalStateException error = assertThrows(IllegalStateException.class, validator::validate);

        assertTrue(error.getMessage().contains("SACCO_REDIS_URL"));
    }

    @Test
    void productionAllowsMultiInstanceWithRedisConfiguration() {
        ScaleReadinessValidator validator = new ScaleReadinessValidator(false, 2, "redis", "redis://cache:6379");

        assertDoesNotThrow(validator::validate);
    }
}
