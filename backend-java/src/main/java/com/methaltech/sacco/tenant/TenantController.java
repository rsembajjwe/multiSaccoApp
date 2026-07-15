package com.methaltech.sacco.tenant;

import com.methaltech.sacco.api.ApiResponse;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tenants")
class TenantController {

    private final TenantRepository tenantRepository;

    TenantController(TenantRepository tenantRepository) {
        this.tenantRepository = tenantRepository;
    }

    @GetMapping
    ApiResponse<List<TenantResponse>> listTenants() {
        return ApiResponse.of(tenantRepository.findAllByOrderByNameAsc().stream()
                .map(TenantResponse::from)
                .toList());
    }
}
