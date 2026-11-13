package com.methaltech.sacco.config;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * A single provider setting for a scope (the literal "platform" for
 * platform-global keys, or a tenant id for a SACCO). Secret values are stored
 * encrypted; non-secret values in plaintext.
 */
@Entity
@Table(name = "integration_provider_credentials")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class ProviderCredential {

    @Id
    private String id;

    @Column(name = "scope_id")
    private String scopeId;

    private String provider;

    @Column(name = "config_key")
    private String configKey;

    @Column(name = "config_value")
    private String configValue;

    @Column(name = "is_secret")
    private boolean secret;

    @Column(name = "updated_by_user_id")
    private String updatedByUserId;

    @Column(name = "updated_at")
    private Instant updatedAt;

    ProviderCredential(
            String id,
            String scopeId,
            String provider,
            String configKey,
            String configValue,
            boolean secret,
            String updatedByUserId) {
        this.id = id;
        this.scopeId = scopeId;
        this.provider = provider;
        this.configKey = configKey;
        this.configValue = configValue;
        this.secret = secret;
        this.updatedByUserId = updatedByUserId;
        this.updatedAt = Instant.now();
    }

    void update(String configValue, boolean secret, String updatedByUserId) {
        this.configValue = configValue;
        this.secret = secret;
        this.updatedByUserId = updatedByUserId;
        this.updatedAt = Instant.now();
    }
}
