package com.methaltech.sacco.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
class DocumentStorageReadinessValidator implements ApplicationRunner {

    private final boolean demoLoginsEnabled;
    private final String provider;
    private final String localRoot;

    DocumentStorageReadinessValidator(
            @Value("${sacco.demo-logins.enabled:true}") boolean demoLoginsEnabled,
            @Value("${sacco.document-storage.provider:demo_noop}") String provider,
            @Value("${sacco.document-storage.local-root:}") String localRoot) {
        this.demoLoginsEnabled = demoLoginsEnabled;
        this.provider = provider == null ? "" : provider.trim();
        this.localRoot = localRoot == null ? "" : localRoot.trim();
    }

    @Override
    public void run(ApplicationArguments args) {
        validate();
    }

    void validate() {
        if (demoLoginsEnabled) {
            return;
        }
        if (!"local_filesystem".equalsIgnoreCase(provider)) {
            throw new IllegalStateException(
                    "Production startup requires implemented document storage: SACCO_DOCUMENT_STORAGE_PROVIDER=local_filesystem");
        }
        if (localRoot.isBlank()) {
            throw new IllegalStateException(
                    "Production startup requires document storage root: SACCO_DOCUMENT_STORAGE_LOCAL_ROOT");
        }
    }
}
