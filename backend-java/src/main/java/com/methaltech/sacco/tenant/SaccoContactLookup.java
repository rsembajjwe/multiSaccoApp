package com.methaltech.sacco.tenant;

import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class SaccoContactLookup {

    private final SaccoProfileRepository saccoProfileRepository;

    SaccoContactLookup(SaccoProfileRepository saccoProfileRepository) {
        this.saccoProfileRepository = saccoProfileRepository;
    }

    public Optional<SaccoContact> findByTenantId(String tenantId) {
        return saccoProfileRepository.findByTenantId(tenantId)
                .map(profile -> new SaccoContact(profile.getLegalName(), profile.getPhone(), profile.getEmail()));
    }
}
