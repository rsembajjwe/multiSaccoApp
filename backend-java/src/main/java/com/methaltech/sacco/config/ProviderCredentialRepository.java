package com.methaltech.sacco.config;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface ProviderCredentialRepository extends JpaRepository<ProviderCredential, String> {

    List<ProviderCredential> findByScopeIdAndProvider(String scopeId, String provider);

    Optional<ProviderCredential> findByScopeIdAndProviderAndConfigKey(
            String scopeId, String provider, String configKey);
}
