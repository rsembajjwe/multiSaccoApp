package com.methaltech.sacco.finance;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/financial-products")
class FinancialProductController {

    private static final Set<String> PRODUCT_TYPES = Set.of("savings", "shares", "welfare");

    private final FinancialProductRepository productRepository;
    private final AuthService authService;
    private final AuditService auditService;

    FinancialProductController(
            FinancialProductRepository productRepository,
            AuthService authService,
            AuditService auditService) {
        this.productRepository = productRepository;
        this.authService = authService;
        this.auditService = auditService;
    }

    @GetMapping
    ResponseEntity<?> listProducts(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId,
            @RequestParam(name = "type", required = false) String requestedType) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "transactions:view")) {
            return authService.permissionRequired("transactions:view");
        }

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null && !authService.isPlatform(currentSession.user())) return tenantAccessDenied();

        String productType = normalizeType(requestedType);
        if (requestedType != null && productType == null) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_PRODUCT_TYPE", "Product type must be savings, shares, or welfare."));
        }

        List<FinancialProduct> products;
        if (authService.isPlatform(currentSession.user()) && requestedTenantId == null) {
            products = productRepository.findAllByOrderByTenantIdAscProductTypeAscCodeAsc();
        } else if (productType == null) {
            products = productRepository.findByTenantIdOrderByProductTypeAscCodeAsc(tenantId);
        } else {
            products = productRepository.findByTenantIdAndProductTypeOrderByCodeAsc(tenantId, productType);
        }

        return ResponseEntity.ok(ApiResponse.of(products.stream().map(FinancialProductResponse::from).toList()));
    }

    @PostMapping
    ResponseEntity<?> createProduct(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody CreateFinancialProductRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "transactions:create")) {
            return authService.permissionRequired("transactions:create");
        }

        String tenantId = tenantScope(currentSession, body.tenantId());
        if (tenantId == null) return tenantAccessDenied();

        String productType = normalizeType(body.productType());
        if (productType == null) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_PRODUCT_TYPE", "Product type must be savings, shares, or welfare."));
        }

        String code = body.code().trim().toUpperCase();
        if (productRepository.existsByTenantIdAndCodeIgnoreCase(tenantId, code)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "FINANCIAL_PRODUCT_EXISTS", "A product with that code already exists for this tenant."));
        }

        BigDecimal contributionAmount = moneyOrZero(body.contributionAmount());
        BigDecimal minimumBalance = moneyOrZero(body.minimumBalance());
        BigDecimal interestRate = rateOrZero(body.interestRate());
        if (contributionAmount.compareTo(BigDecimal.ZERO) < 0 || minimumBalance.compareTo(BigDecimal.ZERO) < 0 || interestRate.compareTo(BigDecimal.ZERO) < 0) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_PRODUCT_AMOUNT", "Product amounts and rates cannot be negative."));
        }

        FinancialProduct product = productRepository.save(new FinancialProduct(
                "product_" + UUID.randomUUID(),
                tenantId,
                productType,
                code,
                body.name().trim(),
                contributionAmount,
                minimumBalance,
                interestRate,
                currentSession.user().getId()));

        auditService.record(
                tenantId,
                currentSession.user(),
                "Created " + productType + " product " + code,
                "financial_product",
                product.getId(),
                request.getRemoteAddr());

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(FinancialProductResponse.from(product)));
    }

    private String tenantScope(AuthService.CurrentSession currentSession, String requestedTenantId) {
        if (authService.isPlatform(currentSession.user())) {
            return requestedTenantId == null || requestedTenantId.isBlank() ? null : requestedTenantId.trim();
        }
        if (requestedTenantId == null || requestedTenantId.isBlank()) return currentSession.user().getTenantId();
        return requestedTenantId.trim().equals(currentSession.user().getTenantId()) ? requestedTenantId.trim() : null;
    }

    private String normalizeType(String productType) {
        if (productType == null || productType.isBlank()) return null;
        String normalized = productType.trim().toLowerCase();
        return PRODUCT_TYPES.contains(normalized) ? normalized : null;
    }

    private BigDecimal moneyOrZero(BigDecimal amount) {
        return amount == null ? BigDecimal.ZERO : amount;
    }

    private BigDecimal rateOrZero(BigDecimal rate) {
        return rate == null ? BigDecimal.ZERO : rate;
    }

    private ResponseEntity<ApiErrorResponse> tenantAccessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access financial products for another tenant."));
    }

    record CreateFinancialProductRequest(
            String tenantId,
            @NotBlank String productType,
            @NotBlank String code,
            @NotBlank String name,
            @NotNull BigDecimal contributionAmount,
            @NotNull BigDecimal minimumBalance,
            BigDecimal interestRate) {
    }
}
