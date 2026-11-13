package com.methaltech.sacco.config;

import com.methaltech.sacco.privacy.PiiCrypto;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Stores and resolves payment-provider settings (MTN, Airtel) per scope.
 * Secrets are encrypted at rest with {@link PiiCrypto}. Resolution order for a
 * tenant is: tenant scope, then the platform scope; callers fall back to the
 * environment-backed defaults when this returns null.
 */
@Service
public class ProviderCredentialService {

    public static final String PLATFORM_SCOPE = "platform";

    private final ProviderCredentialRepository repository;

    ProviderCredentialService(ProviderCredentialRepository repository) {
        this.repository = repository;
    }

    /** Decrypted stored value for one key at one scope, or null if unset/blank. */
    public String value(String scopeId, String provider, String key) {
        return repository.findByScopeIdAndProviderAndConfigKey(scopeId, provider, key)
                .map(credential -> PiiCrypto.decryptNullable(credential.getConfigValue()))
                .filter(value -> value != null && !value.isBlank())
                .orElse(null);
    }

    /** Effective value: the tenant's own value, else the platform value, else null. */
    public String resolve(String tenantScopeId, String provider, String key) {
        if (tenantScopeId != null
                && !tenantScopeId.isBlank()
                && !PLATFORM_SCOPE.equals(tenantScopeId)) {
            String tenantValue = value(tenantScopeId, provider, key);
            if (tenantValue != null) {
                return tenantValue;
            }
        }
        return value(PLATFORM_SCOPE, provider, key);
    }

    /** All decrypted stored values for a scope+provider (used to build the config view). */
    public Map<String, String> storedValues(String scopeId, String provider) {
        Map<String, String> values = new LinkedHashMap<>();
        for (ProviderCredential credential : repository.findByScopeIdAndProvider(scopeId, provider)) {
            values.put(credential.getConfigKey(), PiiCrypto.decryptNullable(credential.getConfigValue()));
        }
        return values;
    }

    /** Upsert one key. Secret values are encrypted before storage. */
    @Transactional
    public void save(
            String scopeId,
            String provider,
            String key,
            String rawValue,
            boolean secret,
            String userId) {
        String stored = secret ? PiiCrypto.encryptNullable(rawValue) : rawValue;
        repository.findByScopeIdAndProviderAndConfigKey(scopeId, provider, key)
                .ifPresentOrElse(
                        existing -> {
                            existing.update(stored, secret, userId);
                            repository.save(existing);
                        },
                        () -> repository.save(new ProviderCredential(
                                "ipc_" + UUID.randomUUID(),
                                scopeId,
                                provider,
                                key,
                                stored,
                                secret,
                                userId)));
    }
}
