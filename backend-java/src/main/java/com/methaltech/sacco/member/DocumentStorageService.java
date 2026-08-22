package com.methaltech.sacco.member;

interface DocumentStorageService {
    String store(String tenantId, String memberId, String documentType, String originalFilename, String contentType, byte[] content);
    DocumentStorageObject read(String storageKey);
    DocumentStorageActionResult dispose(String storageKey);
}
