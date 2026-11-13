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
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/financial-products")
class FinancialProductController {

    // Built-in funds every SACCO always has; custom funds live in the per-SACCO fund-type registry.
    private static final Set<String> PRODUCT_TYPES = Set.of("savings", "shares", "welfare");

    private final FinancialProductRepository productRepository;
    private final FundTypeRepository fundTypeRepository;
    private final AuthService authService;
    private final AuditService auditService;

    FinancialProductController(
            FinancialProductRepository productRepository,
            FundTypeRepository fundTypeRepository,
            AuthService authService,
            AuditService auditService) {
        this.productRepository = productRepository;
        this.fundTypeRepository = fundTypeRepository;
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
        if (!authService.hasPermission(currentSession.user(), "fund-types:view")) {
            return authService.permissionRequired("fund-types:view");
        }

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null && !authService.isPlatform(currentSession.user())) return tenantAccessDenied();

        String productType = normalizeCode(requestedType);
        if (requestedType != null && (productType == null || !isValidFundType(tenantId, productType))) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_PRODUCT_TYPE", "Product type must be a configured fund for this SACCO."));
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
        if (!authService.hasPermission(currentSession.user(), "fund-types:manage")) {
            return authService.permissionRequired("fund-types:manage");
        }

        String tenantId = tenantScope(currentSession, body.tenantId());
        if (tenantId == null) return tenantAccessDenied();

        String productType = normalizeCode(body.productType());
        if (productType == null || !isValidFundType(tenantId, productType)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_PRODUCT_TYPE", "Product type must be a configured fund for this SACCO (e.g. savings, shares, welfare, or a custom fund)."));
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

    @PatchMapping("/{productId}")
    ResponseEntity<?> updateProduct(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String productId,
            @Valid @RequestBody UpdateFinancialProductRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "fund-types:manage")) {
            return authService.permissionRequired("fund-types:manage");
        }

        FinancialProduct product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "FINANCIAL_PRODUCT_NOT_FOUND", "Product was not found."));
        }
        String tenantId = tenantScope(currentSession, product.getTenantId());
        if (tenantId == null || !tenantId.equals(product.getTenantId())) {
            return tenantAccessDenied();
        }

        BigDecimal contributionAmount = body.contributionAmount();
        BigDecimal minimumBalance = body.minimumBalance();
        BigDecimal interestRate = body.interestRate();
        if ((contributionAmount != null && contributionAmount.compareTo(BigDecimal.ZERO) < 0)
                || (minimumBalance != null && minimumBalance.compareTo(BigDecimal.ZERO) < 0)
                || (interestRate != null && interestRate.compareTo(BigDecimal.ZERO) < 0)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_PRODUCT_AMOUNT", "Product amounts and rates cannot be negative."));
        }
        String status = body.status();
        if (status != null && !status.isBlank()
                && !status.trim().equalsIgnoreCase("active")
                && !status.trim().equalsIgnoreCase("inactive")) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_PRODUCT_STATUS", "Status must be active or inactive."));
        }

        product.update(
                body.name(),
                contributionAmount,
                minimumBalance,
                interestRate,
                status == null ? null : status.trim().toLowerCase());
        product = productRepository.save(product);

        auditService.record(
                product.getTenantId(),
                currentSession.user(),
                "Updated product " + product.getCode(),
                "financial_product",
                product.getId(),
                request.getRemoteAddr());

        return ResponseEntity.ok(ApiResponse.of(FinancialProductResponse.from(product)));
    }

    private String tenantScope(AuthService.CurrentSession currentSession, String requestedTenantId) {
        if (authService.isPlatform(currentSession.user())) {
            return requestedTenantId == null || requestedTenantId.isBlank() ? null : requestedTenantId.trim();
        }
        if (requestedTenantId == null || requestedTenantId.isBlank()) return currentSession.user().getTenantId();
        return requestedTenantId.trim().equals(currentSession.user().getTenantId()) ? requestedTenantId.trim() : null;
    }

    private String normalizeCode(String productType) {
        if (productType == null || productType.isBlank()) return null;
        return productType.trim().toLowerCase();
    }

    /**
     * A product type is valid if it is one of the three built-in funds (always available) or an active
     * fund type in this SACCO's configurable registry. The baseline keeps Savings/Shares/Welfare working
     * for every tenant even before any custom fund is configured.
     */
    private boolean isValidFundType(String tenantId, String productType) {
        if (productType == null) return false;
        if (PRODUCT_TYPES.contains(productType)) return true;
        if (tenantId == null) return false;
        return fundTypeRepository.existsByTenantIdAndCodeIgnoreCaseAndActiveTrue(tenantId, productType);
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

    record UpdateFinancialProductRequest(
            String name,
            BigDecimal contributionAmount,
            BigDecimal minimumBalance,
            BigDecimal interestRate,
            String status) {
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
