package com.methaltech.sacco.tenant;

import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class TenantService {

    private final TenantRepository tenantRepository;

    TenantService(TenantRepository tenantRepository) {
        this.tenantRepository = tenantRepository;
    }

    public Optional<TenantResponse> findById(String tenantId) {
        return tenantRepository.findById(tenantId).map(TenantResponse::from);
    }
}
