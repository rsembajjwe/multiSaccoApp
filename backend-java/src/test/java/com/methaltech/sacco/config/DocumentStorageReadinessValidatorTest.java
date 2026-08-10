package com.methaltech.sacco.config;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class DocumentStorageReadinessValidatorTest {

    @Test
    void demoModeAllowsUnconfiguredDocumentStorage() {
        DocumentStorageReadinessValidator validator = new DocumentStorageReadinessValidator(
                true,
                "demo_noop",
                "");

        assertDoesNotThrow(validator::validate);
    }

    @Test
    void productionRejectsUnimplementedDocumentStorageProvider() {
        DocumentStorageReadinessValidator validator = new DocumentStorageReadinessValidator(
                false,
                "demo_noop",
                "/var/lib/tereka/kyc");

        IllegalStateException error = assertThrows(IllegalStateException.class, validator::validate);

        assertTrue(error.getMessage().contains("SACCO_DOCUMENT_STORAGE_PROVIDER=local_filesystem"));
    }

    @Test
    void productionRejectsMissingDocumentStorageRoot() {
        DocumentStorageReadinessValidator validator = new DocumentStorageReadinessValidator(
                false,
                "local_filesystem",
                "");

        IllegalStateException error = assertThrows(IllegalStateException.class, validator::validate);

        assertTrue(error.getMessage().contains("SACCO_DOCUMENT_STORAGE_LOCAL_ROOT"));
    }

    @Test
    void productionAllowsLocalFilesystemDocumentStorage() {
        DocumentStorageReadinessValidator validator = new DocumentStorageReadinessValidator(
                false,
                "local_filesystem",
                "/var/lib/tereka/kyc");

        assertDoesNotThrow(validator::validate);
    }
}
