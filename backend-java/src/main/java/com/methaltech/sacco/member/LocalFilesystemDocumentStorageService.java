package com.methaltech.sacco.member;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
class LocalFilesystemDocumentStorageService implements DocumentStorageService {

    private final String provider;
    private final Path root;

    LocalFilesystemDocumentStorageService(
            @Value("${sacco.document-storage.provider:demo_noop}") String provider,
            @Value("${sacco.document-storage.local-root:}") String localRoot) {
        this.provider = provider == null ? "demo_noop" : provider.trim().toLowerCase();
        this.root = localRoot == null || localRoot.isBlank()
                ? null
                : Path.of(localRoot).toAbsolutePath().normalize();
    }

    @Override
    public DocumentStorageActionResult dispose(String storageKey) {
        if (!"local_filesystem".equals(provider)) {
            return DocumentStorageActionResult.of("demo_noop", "Document storage disposal is disabled in demo/local mode.");
        }
        if (root == null) {
            throw new DocumentStorageException("Document storage root is not configured.");
        }
        Path target = resolveInsideRoot(storageKey);
        try {
            if (Files.deleteIfExists(target)) {
                return DocumentStorageActionResult.of("deleted", target.toString());
            }
            return DocumentStorageActionResult.of("missing", target.toString());
        } catch (IOException ex) {
            throw new DocumentStorageException("Could not dispose document file.", ex);
        }
    }

    private Path resolveInsideRoot(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            throw new DocumentStorageException("Document storage key is blank.");
        }
        Path target = root.resolve(storageKey.replace('\\', '/')).normalize();
        if (!target.startsWith(root)) {
            throw new DocumentStorageException("Document storage key resolves outside the configured root.");
        }
        return target;
    }
}
