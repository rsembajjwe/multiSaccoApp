package com.methaltech.sacco.member;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class LocalFilesystemDocumentStorageServiceTest {

    @TempDir
    Path root;

    @Test
    void deletesDocumentInsideConfiguredRoot() throws Exception {
        Path document = root.resolve("tenant_green/members/GVS-0001/national-id.pdf");
        Files.createDirectories(document.getParent());
        Files.writeString(document, "kyc evidence");

        LocalFilesystemDocumentStorageService storage = new LocalFilesystemDocumentStorageService(
                "local_filesystem",
                root.toString());

        DocumentStorageActionResult result = storage.dispose("tenant_green/members/GVS-0001/national-id.pdf");

        assertEquals("deleted", result.action());
        assertFalse(Files.exists(document));
    }

    @Test
    void rejectsStorageKeysThatEscapeRoot() {
        LocalFilesystemDocumentStorageService storage = new LocalFilesystemDocumentStorageService(
                "local_filesystem",
                root.toString());

        DocumentStorageException error = assertThrows(
                DocumentStorageException.class,
                () -> storage.dispose("../outside.pdf"));

        assertTrue(error.getMessage().contains("outside"));
    }

    @Test
    void demoModeDoesNotDeleteFiles() throws Exception {
        Path document = root.resolve("tenant_green/members/GVS-0001/photo.jpg");
        Files.createDirectories(document.getParent());
        Files.writeString(document, "photo");

        LocalFilesystemDocumentStorageService storage = new LocalFilesystemDocumentStorageService(
                "demo_noop",
                root.toString());

        DocumentStorageActionResult result = storage.dispose("tenant_green/members/GVS-0001/photo.jpg");

        assertEquals("demo_noop", result.action());
        assertTrue(Files.exists(document));
    }
}
