package com.methaltech.sacco.tenant;

import java.util.List;
import java.util.Optional;
import java.util.Collection;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
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

    public Map<String, TenantResponse> findByIds(Collection<String> tenantIds) {
        return tenantRepository.findAllById(tenantIds).stream()
                .map(TenantResponse::from)
                .collect(Collectors.toMap(TenantResponse::id, Function.identity()));
    }
}
