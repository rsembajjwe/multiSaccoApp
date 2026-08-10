package com.methaltech.sacco.identity;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.api.PageParams;
import com.methaltech.sacco.api.PagedResponse;
import com.methaltech.sacco.branch.BranchRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.RequestParam;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/audit-events")
class AuditController {

    private final AuthService authService;
    private final AuditEventRepository auditEventRepository;
    private final AuditService auditService;
    private final BranchRepository branchRepository;

    AuditController(
            AuthService authService,
            AuditEventRepository auditEventRepository,
            AuditService auditService,
            BranchRepository branchRepository) {
        this.authService = authService;
        this.auditEventRepository = auditEventRepository;
        this.auditService = auditService;
        this.branchRepository = branchRepository;
    }

    @GetMapping
    ResponseEntity<?> listAuditEvents(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "sort", required = false) String sortBy,
            @RequestParam(name = "direction", required = false) String direction,
            @RequestParam(name = "page", required = false) Integer page,
            @RequestParam(name = "size", required = false) Integer size) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        boolean platform = authService.isPlatform(currentSession.user());
        String searchTerm = searchTerm(search);
        String tenantId = currentSession.user().getTenantId();
        boolean branchScoped = branchScoped(currentSession);

        if (PageParams.requested(page, size)) {
            Sort sort = sortBy(platform, sortBy, direction, Map.of(
                    "createdAt", "createdAt",
                    "actorName", "actorName",
                    "action", "action",
                    "resourceType", "resourceType",
                    "resourceId", "resourceId",
                    "ipAddress", "ipAddress",
                    "tenantId", "tenantId"), "createdAt", Sort.Direction.DESC);
            Pageable pageable = PageParams.toPageable(page, size, sort);
            Page<AuditEvent> result = platform
                    ? (searchTerm == null ? auditEventRepository.findAll(pageable) : auditEventRepository.searchAll(searchTerm, pageable))
                    : (branchScoped
                            ? (searchTerm == null
                                    ? auditEventRepository.findByTenantIdAndActorUserId(tenantId, currentSession.user().getId(), pageable)
                                    : auditEventRepository.searchByTenantIdAndActorUserId(tenantId, currentSession.user().getId(), searchTerm, pageable))
                            : (searchTerm == null ? auditEventRepository.findByTenantId(tenantId, pageable) : auditEventRepository.searchByTenantId(tenantId, searchTerm, pageable)));
            return ResponseEntity.ok(PagedResponse.of(
                    result.getContent().stream().map(AuditEventResponse::from).toList(),
                    result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages()));
        }

        List<AuditEvent> events = platform
                ? auditEventRepository.findAllByOrderByCreatedAtDesc()
                : (branchScoped
                        ? auditEventRepository.findByTenantIdAndActorUserIdOrderByCreatedAtDesc(tenantId, currentSession.user().getId())
                        : auditEventRepository.findByTenantIdOrderByCreatedAtDesc(tenantId));
        if (searchTerm != null) {
            String needle = searchTerm.toLowerCase(Locale.ROOT);
            events = events.stream()
                    .filter(event -> searchable(event.getActorName(), event.getAction(), event.getResourceType(), event.getResourceId(), event.getIpAddress(), event.getTenantId()).contains(needle))
                    .toList();
        }

        return ResponseEntity.ok(ApiResponse.of(events.stream().map(AuditEventResponse::from).toList()));
    }

    @PostMapping
    ResponseEntity<?> createAuditEvent(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody CreateAuditRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "reports:view")) {
            return authService.permissionRequired("reports:view");
        }

        String tenantId = body.tenantId() == null || body.tenantId().isBlank()
                ? currentSession.user().getTenantId()
                : body.tenantId().trim();

        if (!authService.isPlatform(currentSession.user()) && !tenantId.equals(currentSession.user().getTenantId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot write audit events for another tenant."));
        }

        AuditEvent event = auditService.record(
                tenantId,
                currentSession.user(),
                body.action().trim(),
                blankToNull(body.resourceType()),
                blankToNull(body.resourceId()),
                request.getRemoteAddr());

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(AuditEventResponse.from(event)));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String searchTerm(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }

    private String searchable(String... values) {
        return String.join(" ", java.util.Arrays.stream(values)
                .map(value -> value == null ? "" : value)
                .toList()).toLowerCase(Locale.ROOT);
    }

    private boolean branchScoped(AuthService.CurrentSession currentSession) {
        if (authService.isPlatform(currentSession.user()) || authService.hasPermission(currentSession.user(), "tenants:manage")) {
            return false;
        }
        return !branchRepository.findByTenantIdAndManagerUserIdOrderByCodeAsc(currentSession.user().getTenantId(), currentSession.user().getId()).isEmpty();
    }

    private Sort sortBy(boolean platformAll, String requestedSort, String requestedDirection, Map<String, String> allowed, String fallback, Sort.Direction fallbackDirection) {
        String property = allowed.getOrDefault(requestedSort == null ? "" : requestedSort.trim(), fallback);
        Sort.Direction resolvedDirection = requestedDirection == null || requestedDirection.isBlank()
                ? fallbackDirection
                : ("desc".equalsIgnoreCase(requestedDirection) ? Sort.Direction.DESC : Sort.Direction.ASC);
        Sort sort = Sort.by(resolvedDirection, property);
        return platformAll && !"tenantId".equals(property) ? Sort.by(Sort.Direction.ASC, "tenantId").and(sort) : sort;
    }

    record CreateAuditRequest(
            String tenantId,
            @NotBlank String action,
            String resourceType,
            String resourceId) {
    }
}
