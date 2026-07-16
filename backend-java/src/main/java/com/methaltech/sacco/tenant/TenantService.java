package com.methaltech.sacco.tenant;

import java.util.List;
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

    public List<TenantResponse> findAllNonPlatform() {
        return tenantRepository.findAllByOrderByNameAsc()
                .stream()
                .filter(tenant -> !"tenant_platform".equals(tenant.getId()))
                .map(TenantResponse::from)
                .toList();
    }
}
