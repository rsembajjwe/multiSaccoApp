package com.methaltech.sacco.member;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.UUID;
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
    public String store(String tenantId, String memberId, String documentType, String originalFilename, String contentType, byte[] content) {
        if (root == null) {
            throw new DocumentStorageException("Document storage root is not configured.");
        }
        String filename = safeFilename(originalFilename, documentType, contentType);
        String storageKey = String.join("/",
                "tenants",
                safeSegment(tenantId),
                "members",
                safeSegment(memberId),
                safeSegment(documentType),
                UUID.randomUUID() + "-" + filename);
        Path target = resolveInsideRoot(storageKey);
        try {
            Files.createDirectories(target.getParent());
            Files.write(target, content);
            return storageKey;
        } catch (IOException ex) {
            throw new DocumentStorageException("Could not store member document.", ex);
        }
    }

    @Override
    public DocumentStorageObject read(String storageKey) {
        if (root == null) {
            throw new DocumentStorageException("Document storage root is not configured.");
        }
        Path target = resolveInsideRoot(storageKey);
        if (!Files.exists(target) || !Files.isRegularFile(target)) {
            throw new DocumentStorageException("Document file was not found in storage.");
        }
        try {
            String contentType = Files.probeContentType(target);
            return new DocumentStorageObject(
                    storageKey,
                    target.getFileName().toString(),
                    contentType == null || contentType.isBlank() ? "application/octet-stream" : contentType,
                    Files.readAllBytes(target));
        } catch (IOException ex) {
            throw new DocumentStorageException("Could not read member document.", ex);
        }
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

    private String safeFilename(String originalFilename, String documentType, String contentType) {
        String base = originalFilename == null ? "" : Path.of(originalFilename).getFileName().toString();
        base = base.replaceAll("[^A-Za-z0-9._-]+", "-").replaceAll("^-+|-+$", "");
        String extension = extensionFor(base, contentType);
        String stem = base.replaceFirst("\\.[A-Za-z0-9]{1,8}$", "");
        if (stem.isBlank()) {
            stem = safeSegment(documentType);
        }
        return stem + extension;
    }

    private String extensionFor(String filename, String contentType) {
        String lower = filename.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return ".jpg";
        if (lower.endsWith(".png")) return ".png";
        if (lower.endsWith(".webp")) return ".webp";
        if (lower.endsWith(".pdf")) return ".pdf";
        String type = contentType == null ? "" : contentType.toLowerCase(Locale.ROOT);
        if (type.contains("jpeg")) return ".jpg";
        if (type.contains("png")) return ".png";
        if (type.contains("webp")) return ".webp";
        if (type.contains("pdf")) return ".pdf";
        return ".bin";
    }

    private String safeSegment(String value) {
        String segment = value == null ? "" : value.replaceAll("[^A-Za-z0-9_-]+", "-").replaceAll("^-+|-+$", "");
        return segment.isBlank() ? "unknown" : segment;
    }
}
