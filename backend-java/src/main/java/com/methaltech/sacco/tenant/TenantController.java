package com.methaltech.sacco.tenant;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.api.PageParams;
import com.methaltech.sacco.api.PagedResponse;
import com.methaltech.sacco.branch.DefaultBranchProvisioningService;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.identity.DefaultSaccoRoleProvisioningService;
import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberRepository;
import com.methaltech.sacco.notification.NotificationService;
import com.methaltech.sacco.subscription.Subscription;
import com.methaltech.sacco.subscription.SubscriptionAccessService;
import com.methaltech.sacco.subscription.SubscriptionRepository;
import com.methaltech.sacco.subscription.SubscriptionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/v1/tenants")
class TenantController {

    private static final Set<String> ALLOWED_STATUSES = Set.of("pending_review", "approved", "active", "inactive", "suspended", "terminated");
    private static final Set<String> BULK_ALLOWED_STATUSES = Set.of("pending_review", "inactive", "suspended");

    private final TenantRepository tenantRepository;
    private final SaccoProfileRepository saccoProfileRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final SubscriptionService subscriptionService;
    private final AuthService authService;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final SubscriptionAccessService subscriptionAccessService;
    private final com.methaltech.sacco.finance.FundTypeProvisioningService fundTypeProvisioningService;
    private final TenantPurgeService tenantPurgeService;
    private final MemberRepository memberRepository;
    private final SaccoOfficialAssignmentRepository officialAssignmentRepository;
    private final DefaultBranchProvisioningService defaultBranchProvisioningService;
    private final DefaultSaccoRoleProvisioningService defaultSaccoRoleProvisioningService;
    private final com.methaltech.sacco.member.SaccoStarterMemberProvisioningService starterMemberProvisioningService;
    private final boolean provisionStarterMembers;
    private final boolean tenantPurgeEnabled;

    TenantController(
            TenantRepository tenantRepository,
            SaccoProfileRepository saccoProfileRepository,
            SubscriptionRepository subscriptionRepository,
            SubscriptionService subscriptionService,
            AuthService authService,
            AuditService auditService,
            NotificationService notificationService,
            SubscriptionAccessService subscriptionAccessService,
            com.methaltech.sacco.finance.FundTypeProvisioningService fundTypeProvisioningService,
            TenantPurgeService tenantPurgeService,
            MemberRepository memberRepository,
            SaccoOfficialAssignmentRepository officialAssignmentRepository,
            DefaultBranchProvisioningService defaultBranchProvisioningService,
            DefaultSaccoRoleProvisioningService defaultSaccoRoleProvisioningService,
            com.methaltech.sacco.member.SaccoStarterMemberProvisioningService starterMemberProvisioningService,
            @org.springframework.beans.factory.annotation.Value("${sacco.provision-starter-members:false}") boolean provisionStarterMembers,
            @org.springframework.beans.factory.annotation.Value("${sacco.tenant-purge.enabled:false}") boolean tenantPurgeEnabled) {
        this.tenantRepository = tenantRepository;
        this.saccoProfileRepository = saccoProfileRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.subscriptionService = subscriptionService;
        this.authService = authService;
        this.auditService = auditService;
        this.notificationService = notificationService;
        this.subscriptionAccessService = subscriptionAccessService;
        this.fundTypeProvisioningService = fundTypeProvisioningService;
        this.tenantPurgeService = tenantPurgeService;
        this.memberRepository = memberRepository;
        this.officialAssignmentRepository = officialAssignmentRepository;
        this.defaultBranchProvisioningService = defaultBranchProvisioningService;
        this.defaultSaccoRoleProvisioningService = defaultSaccoRoleProvisioningService;
        this.starterMemberProvisioningService = starterMemberProvisioningService;
        this.provisionStarterMembers = provisionStarterMembers;
        this.tenantPurgeEnabled = tenantPurgeEnabled;
    }

    @GetMapping
    ResponseEntity<?> listTenants(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "tenants:view")
                && !authService.hasPermission(currentSession.user(), "sacco-profile:manage")) {
            return authService.permissionRequired("sacco-profile:manage");
        }

        if (authService.isPlatform(currentSession.user()) && PageParams.requested(page, size)) {
            Page<Tenant> tenantPage = tenantRepository.findAll(PageParams.toPageable(page, size, Sort.by("name").ascending()));
            return ResponseEntity.ok(PagedResponse.of(
                    tenantPage.getContent().stream().map(TenantResponse::from).toList(),
                    tenantPage.getNumber(), tenantPage.getSize(), tenantPage.getTotalElements(), tenantPage.getTotalPages()));
        }

        List<Tenant> tenants = authService.isPlatform(currentSession.user())
                ? tenantRepository.findAllByOrderByNameAsc()
                : tenantRepository.findById(currentSession.user().getTenantId()).stream().toList();

        return ResponseEntity.ok(ApiResponse.of(tenants.stream()
                .map(TenantResponse::from)
                .toList()));
    }

    @GetMapping("/fleet")
    ResponseEntity<?> fleetDirectory(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String health,
            @RequestParam(required = false) String accountManager,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false, defaultValue = "name") String sort,
            @RequestParam(required = false, defaultValue = "asc") String direction) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.isPlatform(currentSession.user()) || !authService.hasPermission(currentSession.user(), "tenants:view")) {
            return authService.permissionRequired("tenants:view");
        }

        String sortProperty = switch (sort) {
            case "status", "district", "createdAt", "updatedAt", "accountManagerName" -> sort;
            default -> "name";
        };
        Sort.Direction sortDirection = "desc".equalsIgnoreCase(direction) ? Sort.Direction.DESC : Sort.Direction.ASC;
        Pageable pageable = PageParams.toPageable(page, size, Sort.by(sortDirection, sortProperty));
        Specification<Tenant> specification = (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new java.util.ArrayList<>();
            predicates.add(cb.notEqual(root.get("id"), "tenant_platform"));
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), pattern),
                        cb.like(cb.lower(root.get("abbreviation")), pattern),
                        cb.like(cb.lower(root.get("registrationNo")), pattern),
                        cb.like(cb.lower(root.get("district")), pattern)));
            }
            if (status != null && !status.isBlank()) predicates.add(cb.equal(root.get("status"), status.trim().toLowerCase(Locale.ROOT)));
            if (district != null && !district.isBlank()) predicates.add(cb.equal(cb.lower(root.get("district")), district.trim().toLowerCase(Locale.ROOT)));
            if (accountManager != null && !accountManager.isBlank()) {
                if ("unassigned".equalsIgnoreCase(accountManager)) predicates.add(cb.isNull(root.get("accountManagerUserId")));
                else predicates.add(cb.equal(root.get("accountManagerUserId"), accountManager.trim()));
            }
            return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
        if (health != null && !health.isBlank()) {
            List<Tenant> candidates = tenantRepository.findAll(specification, Sort.by(sortDirection, sortProperty));
            Map<String, Subscription> candidateSubscriptions = latestSubscriptions(candidates);
            List<FleetTenantResponse> matchingHealth = candidates.stream()
                    .map(tenant -> FleetTenantResponse.from(tenant, candidateSubscriptions.get(tenant.getId())))
                    .filter(row -> row.health().equalsIgnoreCase(health))
                    .toList();
            return ResponseEntity.ok(PageParams.paged(matchingHealth, page, size));
        }
        Page<Tenant> tenantPage = tenantRepository.findAll(specification, pageable);
        Map<String, Subscription> latestSubscriptions = latestSubscriptions(tenantPage.getContent());
        List<FleetTenantResponse> rows = tenantPage.getContent().stream()
                .map(tenant -> FleetTenantResponse.from(tenant, latestSubscriptions.get(tenant.getId())))
                .toList();
        return ResponseEntity.ok(PagedResponse.of(rows, tenantPage.getNumber(), tenantPage.getSize(), tenantPage.getTotalElements(), tenantPage.getTotalPages()));
    }

    @GetMapping("/fleet/summary")
    ResponseEntity<?> fleetSummary(
            @RequestHeader(name = "Authorization", required = false) String authorization) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.isPlatform(currentSession.user()) || !authService.hasPermission(currentSession.user(), "tenants:view")) {
            return authService.permissionRequired("tenants:view");
        }
        List<Tenant> tenants = tenantRepository.findAll().stream()
                .filter(tenant -> !"tenant_platform".equals(tenant.getId()))
                .toList();
        Map<String, Subscription> subscriptions = latestSubscriptions(tenants);
        List<FleetTenantResponse> fleet = tenants.stream()
                .map(tenant -> FleetTenantResponse.from(tenant, subscriptions.get(tenant.getId())))
                .toList();
        return ResponseEntity.ok(ApiResponse.of(FleetSummaryResponse.from(fleet)));
    }

    @PatchMapping("/fleet/bulk")
    ResponseEntity<?> bulkManageFleet(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody FleetBulkUpdateRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.isPlatform(currentSession.user()) || !authService.hasPermission(currentSession.user(), "tenants:manage")) {
            return authService.permissionRequired("tenants:manage");
        }
        List<String> tenantIds = body.tenantIds() == null ? List.of() : body.tenantIds().stream().distinct().toList();
        if (tenantIds.isEmpty() || tenantIds.size() > 100) {
            return ResponseEntity.badRequest().body(ApiErrorResponse.of(400, "INVALID_BULK_SCOPE", "Select between 1 and 100 SACCOs."));
        }
        if (body.status() != null && !body.status().isBlank() && !BULK_ALLOWED_STATUSES.contains(body.status())) {
            return ResponseEntity.badRequest().body(ApiErrorResponse.of(400, "INVALID_BULK_STATUS", "Bulk status changes are limited to pending review, inactive, or suspended. Activate SACCOs individually after readiness checks."));
        }
        boolean ownerProvided = body.accountManagerUserId() != null || body.accountManagerName() != null;
        boolean statusProvided = body.status() != null && !body.status().isBlank();
        if (!ownerProvided && !statusProvided) {
            return ResponseEntity.badRequest().body(ApiErrorResponse.of(400, "BULK_ACTION_REQUIRED", "Choose a status or account manager assignment."));
        }
        List<Tenant> tenants = tenantRepository.findAllById(tenantIds).stream()
                .filter(tenant -> !"tenant_platform".equals(tenant.getId()))
                .toList();
        for (Tenant tenant : tenants) {
            if (statusProvided) tenant.updateStatus(body.status());
            if (ownerProvided) tenant.assignAccountManager(body.accountManagerUserId(), body.accountManagerName());
            auditService.record(tenant.getId(), currentSession.user(), "Bulk fleet update: " + bulkUpdateDescription(body), "tenant", tenant.getId(), request.getRemoteAddr());
        }
        tenantRepository.saveAll(tenants);
        Map<String, Subscription> latestSubscriptions = latestSubscriptions(tenants);
        return ResponseEntity.ok(ApiResponse.of(tenants.stream()
                .map(tenant -> FleetTenantResponse.from(tenant, latestSubscriptions.get(tenant.getId())))
                .toList()));
    }

    private Map<String, Subscription> latestSubscriptions(List<Tenant> tenants) {
        List<String> tenantIds = tenants.stream().map(Tenant::getId).toList();
        Map<String, Subscription> latest = new LinkedHashMap<>();
        if (tenantIds.isEmpty()) return latest;
        subscriptionRepository.findByTenantIdInOrderByTenantIdAscCreatedAtDesc(tenantIds)
                .forEach(subscription -> latest.putIfAbsent(subscription.getTenantId(), subscription));
        return latest;
    }

    private String bulkUpdateDescription(FleetBulkUpdateRequest body) {
        if (body.status() != null && !body.status().isBlank()) return "status=" + body.status();
        return "accountManager=" + (body.accountManagerName() == null || body.accountManagerName().isBlank() ? "unassigned" : body.accountManagerName());
    }

    @GetMapping("/{tenantId}")
    ResponseEntity<?> getTenant(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String tenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "tenants:view")) {
            return authService.permissionRequired("tenants:view");
        }
        if (!canAccessTenant(currentSession, tenantId)) return tenantAccessDenied("Cannot view another tenant.");

        return tenantRepository.findById(tenantId)
                .<ResponseEntity<?>>map(tenant -> ResponseEntity.ok(ApiResponse.of(TenantResponse.from(tenant))))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "TENANT_NOT_FOUND", "Tenant not found.")));
    }

    @PostMapping
    @Transactional
    ResponseEntity<?> createTenant(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody CreateTenantRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "tenants:manage")) {
            return authService.permissionRequired("tenants:manage");
        }
        if (!authService.isPlatform(currentSession.user())) return platformRequired("Only platform administrators can create tenants here.");

        boolean paid = "paid".equalsIgnoreCase(blankToDefault(body.paymentStatus()));
        // A registration that supplies a payment status (paid or an explicit unpaid) is a real onboarding
        // and begins operating immediately; one that omits it is a bare record awaiting platform review.
        boolean paymentStatusProvided = body.paymentStatus() != null && !body.paymentStatus().isBlank();
        String saccoCode = nextAvailableSaccoCode(generatedSaccoCode(body.name()));
        Tenant tenant = new Tenant(
                "tenant_" + UUID.randomUUID(),
                body.name().trim(),
                saccoCode,
                blankToDefault(body.registrationNo()),
                blankToDefault(body.district()),
                blankToDefault(body.country(), "Uganda"),
                blankToDefault(body.localeCode(), "en-UG"),
                blankToDefault(body.currencyCode(), "UGX").toUpperCase(),
                body.currencyDigits() == null ? 0 : body.currencyDigits(),
                body.licenseExpiry() == null ? LocalDate.now().plusYears(1) : body.licenseExpiry(),
                blankToDefault(body.packageId()));
        Tenant savedTenant = tenantRepository.save(tenant);
        defaultBranchProvisioningService.ensureMainBranch(
            savedTenant.getId(),
            savedTenant.getAbbreviation(),
            blankToDefault(body.district()),
            currentSession.user().getId());
        // The Chairperson is the SACCO administrator, so provision the Chairperson role (which carries the
        // full administrator permission set) instead of a separate "SACCO Administrator" role.
        defaultSaccoRoleProvisioningService.ensureOfficialRole(savedTenant.getId(), "chairperson", currentSession.user().getId());
        SaccoProfile profile = saccoProfileRepository.save(new SaccoProfile(
                "profile_" + UUID.randomUUID(),
                savedTenant.getId(),
                savedTenant.getName(),
                "",
                "",
                savedTenant.getRegistrationNo(),
                address(body.district(), body.parish(), body.village(), body.memberRange()),
                "",
                blankToDefault(body.contactNumber()),
                ""));
        Subscription subscription = subscriptionRepository.save(subscriptionService.createInitialSubscription(
                savedTenant.getId(),
                savedTenant.getPackageId(),
                paid));
        // A paid registration is activated immediately with a covered operating trial window. An unpaid
        // registration that still supplied a payment status begins an active setup trial (its subscription
        // remains in "trial" and lapses to read-only once it expires). A registration that omitted the
        // payment status stays in pending_review until the platform completes its review.
        if (paid) {
            savedTenant.updateStatus("active");
            savedTenant = tenantRepository.save(savedTenant);
            subscriptionAccessService.activateTrialIfCovered(subscription, LocalDate.now().plusYears(1));
            subscriptionRepository.save(subscription);
        } else if (paymentStatusProvided) {
            savedTenant.updateStatus("active");
            savedTenant = tenantRepository.save(savedTenant);
        }
        // Seed the three built-in fund sources so the new SACCO's fund registry is ready to use.
        fundTypeProvisioningService.seedDefaults(savedTenant.getId(), currentSession.user().getId());
        // Optional demo convenience: give a brand-new SACCO three active starter members so the chairperson,
        // secretary and treasurer can be assigned immediately. Off by default (opt in with
        // sacco.provision-starter-members=true) so production and the test suite never get placeholder members.
        // Best-effort so it can never fail SACCO creation.
        if (provisionStarterMembers) {
            try {
                starterMemberProvisioningService.provisionStarterMembers(
                        savedTenant.getId(),
                        savedTenant.getAbbreviation(),
                        blankToDefault(body.district()),
                        currentSession.user().getId());
            } catch (RuntimeException starterMembersFailed) {
                // Starter members are a convenience only; ignore and let SACCO creation succeed.
            }
        }

        auditService.record(
                savedTenant.getId(),
                currentSession.user(),
                "Created SACCO " + savedTenant.getName() + " with subscription payment " + (paid ? "paid" : "pending"),
                "tenant",
                savedTenant.getId(),
                request.getRemoteAddr());
        notificationService.notifySaccoContact(
                savedTenant.getId(),
            paid ? "sacco_created_pending_officials" : "sacco_created_pending_payment",
            paid ? "SACCO payment confirmed - setup required" : "SACCO one-month setup trial activated",
                paid
                ? savedTenant.getName() + " has been created with payment confirmed. Add at least three members and assign the chairperson, secretary, and treasurer before activation."
                        : savedTenant.getName() + " has been created on Tereka Online with a one-month setup and testing trial. Data entry will stop after the trial unless the subscription is paid.",
                "tenant",
                savedTenant.getId(),
                profile.getPhone(),
                profile.getEmail());

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(TenantResponse.from(savedTenant)));
    }

    @PatchMapping("/{tenantId}/status")
    ResponseEntity<?> updateTenantStatus(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String tenantId,
            @Valid @RequestBody UpdateTenantStatusRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "tenants:manage")) {
            return authService.permissionRequired("tenants:manage");
        }
        if (!authService.isPlatform(currentSession.user())) return platformRequired("Only platform administrators can update tenant status.");
        if (!ALLOWED_STATUSES.contains(body.status())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiErrorResponse.of(400, "INVALID_TENANT_STATUS", "Unsupported tenant status."));
        }

        Tenant tenant = tenantRepository.findById(tenantId).orElse(null);
        if (tenant == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "TENANT_NOT_FOUND", "Tenant not found."));
        }

        if ("active".equals(body.status()) && !hasRequiredOfficials(tenantId)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiErrorResponse.of(409, "SACCO_OFFICIALS_REQUIRED",
                    "Assign three SACCO member officials - chairperson, secretary, and treasurer - before activation."));
        }

        tenant.updateStatus(body.status());
        if ("active".equals(body.status())) {
            Subscription subscription = subscriptionRepository.findFirstByTenantIdOrderByCreatedAtDesc(tenantId).orElse(null);
            if (subscription != null) {
                subscriptionAccessService.activateTrialIfCovered(subscription, LocalDate.now().plusYears(1));
                subscriptionRepository.save(subscription);
            }
        }
        Tenant savedTenant = tenantRepository.save(tenant);
        SaccoProfile profile = saccoProfileRepository.findByTenantId(tenantId).orElse(null);
        auditService.record(
                tenantId,
                currentSession.user(),
                "Updated tenant status to " + body.status(),
                "tenant",
                tenantId,
                request.getRemoteAddr());
        if (profile != null) {
            notificationService.notifySaccoContact(
                    tenantId,
                    "sacco_status_updated",
                    "SACCO status updated",
                    "Your SACCO status on Tereka Online is now " + body.status().replace('_', ' ') + ".",
                    "tenant",
                    tenantId,
                    profile.getPhone(),
                    profile.getEmail());
        }

        return ResponseEntity.ok(ApiResponse.of(TenantResponse.from(savedTenant)));
    }

    @PatchMapping("/{tenantId}/details")
    ResponseEntity<?> updateTenantDetails(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String tenantId,
            @Valid @RequestBody UpdateTenantDetailsRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "tenants:manage")
                && !authService.hasPermission(currentSession.user(), "sacco-profile:manage")) {
            return authService.permissionRequired("sacco-profile:manage");
        }
        if (!canAccessTenant(currentSession, tenantId)) return tenantAccessDenied("Cannot update another tenant's details.");

        Tenant tenant = tenantRepository.findById(tenantId).orElse(null);
        if (tenant == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "TENANT_NOT_FOUND", "Tenant not found."));
        }
        String name = firstNonBlank(body.name(), tenant.getName());
        String registrationNo = updateOptional(body.registrationNo(), tenant.getRegistrationNo());
        String district = updateOptional(body.district(), tenant.getDistrict());
        String country = firstNonBlank(body.country(), tenant.getCountry());
        tenant.updateDetails(name, registrationNo, district, country);
        Tenant savedTenant = tenantRepository.save(tenant);

        saccoProfileRepository.findByTenantId(tenantId).ifPresent(profile -> {
            profile.update(
                    body.name() == null ? profile.getLegalName() : name,
                    profile.getTin(),
                    profile.getUmraLicenseNo(),
                    body.registrationNo() == null ? profile.getCooperativeRegistrationNo() : registrationNo,
                    profile.getAddress(),
                    profile.getEmail(),
                    profile.getPhone(),
                    profile.getWebsite());
            saccoProfileRepository.save(profile);
        });
        auditService.record(
                tenantId,
                currentSession.user(),
                "Updated SACCO details for " + savedTenant.getName(),
                "tenant",
                tenantId,
                request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(TenantResponse.from(savedTenant)));
    }

    @DeleteMapping("/{tenantId}")
    ResponseEntity<?> deleteTenant(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String tenantId,
            @Valid @RequestBody DeleteTenantRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!tenantPurgeEnabled) return tenantPurgeDisabled();
        if (!authService.hasPermission(currentSession.user(), "tenants:delete")) {
            return authService.permissionRequired("tenants:delete");
        }
        if (!authService.isPlatform(currentSession.user())) {
            return platformRequired("Only platform administrators can delete a SACCO.");
        }
        if (TenantPurgeService.PLATFORM_TENANT_ID.equals(tenantId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "PLATFORM_TENANT_PROTECTED", "The platform tenant cannot be deleted."));
        }

        Tenant tenant = tenantRepository.findById(tenantId).orElse(null);
        if (tenant == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "TENANT_NOT_FOUND", "Tenant not found."));
        }

        // Typed confirmation: the admin must retype the SACCO's exact code to authorise permanent deletion.
        String typed = body.confirmCode() == null ? "" : body.confirmCode().trim();
        String expectedCode = tenant.getAbbreviation() == null ? "" : tenant.getAbbreviation().trim();
        if (expectedCode.isEmpty() || !typed.equalsIgnoreCase(expectedCode)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "DELETE_CONFIRMATION_MISMATCH",
                            "Type the SACCO code exactly to confirm permanent deletion."));
        }

        String tenantName = tenant.getName();
        int rowsRemoved;
        try {
            rowsRemoved = tenantPurgeService.purgeTenantsStrict(List.of(tenantId));
        } catch (TenantPurgeService.TenantHasFinancialHistoryException protectedHistory) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "TENANT_HAS_FINANCIAL_HISTORY",
                            "This SACCO has posted financial transactions and cannot be permanently deleted. Deactivate it to preserve the audit trail."));
        } catch (TenantPurgeService.TenantPurgeIncompleteException incomplete) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "TENANT_DELETE_INCOMPLETE",
                            "Could not fully remove this SACCO because some records are still referenced. The deletion was rolled back; nothing was changed. Please contact support."));
        }
        // Audit under the surviving platform tenant - the deleted tenant's own audit rows are gone.
        auditService.record(
                TenantPurgeService.PLATFORM_TENANT_ID,
                currentSession.user(),
                "Permanently deleted SACCO " + tenantName + " (" + tenantId + "); rows removed: " + rowsRemoved,
                "tenant",
                tenantId,
                request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(new DeleteTenantResponse(tenantId, tenantName, rowsRemoved)));
    }

    @PostMapping("/purge-all")
    ResponseEntity<?> purgeAllTenants(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody PurgeAllTenantsRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!tenantPurgeEnabled) return tenantPurgeDisabled();
        if (!authService.hasPermission(currentSession.user(), "tenants:delete")) {
            return authService.permissionRequired("tenants:delete");
        }
        if (!authService.isPlatform(currentSession.user())) {
            return platformRequired("Only platform administrators can reset all SACCOs.");
        }

        // A deliberately awkward fixed confirmation phrase for the all-tenant clean slate, so it can never
        // be triggered by a single mistaken click.
        String typed = body.confirm() == null ? "" : body.confirm().trim();
        if (!"DELETE ALL SACCOS".equals(typed)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "PURGE_ALL_CONFIRMATION_MISMATCH",
                            "Type DELETE ALL SACCOS exactly to confirm removing every SACCO."));
        }

        long saccoCount = tenantRepository.findAll().stream()
                .filter(candidate -> !TenantPurgeService.PLATFORM_TENANT_ID.equals(candidate.getId()))
                .count();
        int rowsRemoved;
        try {
            rowsRemoved = tenantPurgeService.purgeTenantsStrict(tenantRepository.findAll().stream()
                    .map(Tenant::getId)
                    .filter(id -> !TenantPurgeService.PLATFORM_TENANT_ID.equals(id))
                    .toList());
        } catch (TenantPurgeService.TenantHasFinancialHistoryException protectedHistory) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "TENANTS_HAVE_FINANCIAL_HISTORY",
                            "The reset includes SACCOs with posted financial transactions. Deactivate those SACCOs instead to preserve their audit trails."));
        } catch (TenantPurgeService.TenantPurgeIncompleteException incomplete) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "TENANT_DELETE_INCOMPLETE",
                            "Could not fully remove every SACCO because some records are still referenced. The reset was rolled back; nothing was changed. Please contact support."));
        }
        auditService.record(
                TenantPurgeService.PLATFORM_TENANT_ID,
                currentSession.user(),
                "Permanently deleted ALL SACCOs (" + saccoCount + " tenants); rows removed: " + rowsRemoved,
                "tenant",
                "all",
                request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(new DeleteTenantResponse("all", saccoCount + " SACCOs", rowsRemoved)));
    }

    private ResponseEntity<ApiErrorResponse> tenantPurgeDisabled() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "TENANT_PURGE_DISABLED",
                        "Permanent SACCO deletion is disabled. Use a lifecycle status such as inactive, suspended, or terminated to retain financial and audit history."));
    }

    @GetMapping("/{tenantId}/officials")
    ResponseEntity<?> listOfficials(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String tenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "tenants:view")
                && !authService.hasPermission(currentSession.user(), "members:view")
                && !authService.hasPermission(currentSession.user(), "sacco-profile:manage")) {
            return authService.permissionRequired("members:view");
        }
        if (!canAccessTenant(currentSession, tenantId)) return tenantAccessDenied("Cannot view another tenant's officials.");
        if (!tenantRepository.existsById(tenantId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "TENANT_NOT_FOUND", "Tenant not found."));
        }

        return ResponseEntity.ok(ApiResponse.of(officialResponses(tenantId)));
    }

    @PatchMapping("/{tenantId}/officials/{office}")
    ResponseEntity<?> assignOfficial(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String tenantId,
            @PathVariable String office,
            @Valid @RequestBody AssignOfficialRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "tenants:manage")) {
            return authService.permissionRequired("tenants:manage");
        }
        if (!canAccessTenant(currentSession, tenantId)) return tenantAccessDenied("Cannot update another tenant's officials.");
        if (!tenantRepository.existsById(tenantId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "TENANT_NOT_FOUND", "Tenant not found."));
        }

        String normalizedOffice = normalizedOffice(office);
        if (normalizedOffice == null) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_SACCO_OFFICE", "Office must be chairperson, secretary, or treasurer."));
        }

        Member member = memberRepository.findById(body.memberId().trim()).orElse(null);
        if (member == null || !tenantId.equals(member.getTenantId())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiErrorResponse.of(400, "OFFICIAL_MEMBER_REQUIRED", "The official must be a member of this SACCO."));
        }

        SaccoOfficialAssignment assignedElsewhere = officialAssignmentRepository.findByTenantIdAndMemberId(tenantId, member.getId()).orElse(null);
        if (assignedElsewhere != null && !normalizedOffice.equals(assignedElsewhere.getOffice())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "OFFICIAL_ALREADY_ASSIGNED", "That member already holds another SACCO official position."));
        }

        SaccoOfficialAssignment assignment = officialAssignmentRepository.findByTenantIdAndOffice(tenantId, normalizedOffice)
                .orElseGet(() -> new SaccoOfficialAssignment(
                        "official_" + UUID.randomUUID(),
                        tenantId,
                        normalizedOffice,
                        member.getId(),
                        currentSession.user().getId()));
        assignment.transferTo(member.getId(), currentSession.user().getId());
        officialAssignmentRepository.save(assignment);

        auditService.record(
                tenantId,
                currentSession.user(),
                "Assigned SACCO " + normalizedOffice + " to " + member.getMembershipNo(),
                "sacco_official",
                assignment.getId(),
                request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(officialResponses(tenantId)));
    }

    @PatchMapping("/{tenantId}/collection-mode")
    ResponseEntity<?> updateCollectionMode(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String tenantId,
            @Valid @RequestBody UpdateCollectionModeRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "tenants:manage")) {
            return authService.permissionRequired("tenants:manage");
        }
        if (!authService.isPlatform(currentSession.user())) {
            return platformRequired("Only platform administrators can set the allowed payment collection mode.");
        }
        CollectionMode mode = CollectionMode.parse(body.allowedCollectionMode());
        if (mode == null) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_COLLECTION_MODE", "Allowed collection mode must be NONE, MOBILE_MONEY_ONLY, BANK_ONLY, or BOTH."));
        }

        Tenant tenant = tenantRepository.findById(tenantId).orElse(null);
        if (tenant == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "TENANT_NOT_FOUND", "Tenant not found."));
        }

        tenant.updateAllowedCollectionMode(mode);
        Tenant savedTenant = tenantRepository.save(tenant);
        auditService.record(
                tenantId,
                currentSession.user(),
                "Set allowed payment collection mode to " + mode.name(),
                "tenant",
                tenantId,
                request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(TenantResponse.from(savedTenant)));
    }

    @PatchMapping("/{tenantId}/collection-settings")
    ResponseEntity<?> updateCollectionSettings(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String tenantId,
            @Valid @RequestBody UpdateCollectionSettingsRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "tenants:manage")) {
            return authService.permissionRequired("tenants:manage");
        }
        if (!canAccessTenant(currentSession, tenantId)) {
            return tenantAccessDenied("Cannot change payment collection settings for another SACCO.");
        }

        Tenant tenant = tenantRepository.findById(tenantId).orElse(null);
        if (tenant == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "TENANT_NOT_FOUND", "Tenant not found."));
        }

        CollectionMode allowed = tenant.getAllowedCollectionMode();
        boolean mobileMoneyActive = Boolean.TRUE.equals(body.mobileMoneyActive());
        boolean bankActive = Boolean.TRUE.equals(body.bankActive());
        if (mobileMoneyActive && !allowed.allowsMobileMoney()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "COLLECTION_METHOD_NOT_ALLOWED", "Mobile money collection is not allowed for this SACCO by the platform."));
        }
        if (bankActive && !allowed.allowsBank()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "COLLECTION_METHOD_NOT_ALLOWED", "Bank collection is not allowed for this SACCO by the platform."));
        }

        tenant.updateCollectionActivation(mobileMoneyActive, bankActive);
        Tenant savedTenant = tenantRepository.save(tenant);
        auditService.record(
                tenantId,
                currentSession.user(),
                "Updated payment collection activation (mobileMoney=" + mobileMoneyActive + ", bank=" + bankActive + ")",
                "tenant",
                tenantId,
                request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(TenantResponse.from(savedTenant)));
    }

    @GetMapping("/{tenantId}/profile")
    ResponseEntity<?> getSaccoProfile(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String tenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "tenants:view")) {
            return authService.permissionRequired("tenants:view");
        }
        if (!canAccessTenant(currentSession, tenantId)) return tenantAccessDenied("Cannot view another tenant profile.");
        if (!tenantRepository.existsById(tenantId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "TENANT_NOT_FOUND", "Tenant not found."));
        }

        return saccoProfileRepository.findByTenantId(tenantId)
                .<ResponseEntity<?>>map(profile -> ResponseEntity.ok(ApiResponse.of(SaccoProfileResponse.from(profile))))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "SACCO_PROFILE_NOT_FOUND", "SACCO profile not found.")));
    }

    @PatchMapping("/{tenantId}/profile")
    ResponseEntity<?> updateSaccoProfile(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String tenantId,
            @Valid @RequestBody UpdateSaccoProfileRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "tenants:manage")
                && !authService.hasPermission(currentSession.user(), "sacco-profile:manage")) {
            return authService.permissionRequired("sacco-profile:manage");
        }
        if (!canAccessTenant(currentSession, tenantId)) return tenantAccessDenied("Cannot update another tenant profile.");

        Tenant tenant = tenantRepository.findById(tenantId).orElse(null);
        if (tenant == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "TENANT_NOT_FOUND", "Tenant not found."));
        }

        SaccoProfile profile = saccoProfileRepository.findByTenantId(tenantId)
                .orElseGet(() -> new SaccoProfile(
                        "profile_" + UUID.randomUUID(),
                        tenantId,
                        tenant.getName(),
                        "",
                        "",
                        tenant.getRegistrationNo(),
                        "",
                        "",
                        "",
                        ""));
        profile.update(
                firstNonBlank(body.legalName(), profile.getLegalName()),
                updateOptional(body.tin(), profile.getTin()),
                updateOptional(body.umraLicenseNo(), profile.getUmraLicenseNo()),
                updateOptional(body.cooperativeRegistrationNo(), profile.getCooperativeRegistrationNo()),
                updateOptional(body.address(), profile.getAddress()),
                updateOptional(body.email(), profile.getEmail()),
                updateOptional(body.phone(), profile.getPhone()),
                updateOptional(body.website(), profile.getWebsite()));
        profile.updateMembershipCalendar(
                normalizeMembershipPeriod(firstNonBlank(body.membershipDuesPeriod(), profile.getMembershipDuesPeriod())),
                normalizeCalendarMonth(body.membershipCalendarStartMonth(), profile.getMembershipCalendarStartMonth()),
                normalizeCalendarDay(body.membershipCalendarStartDay(), profile.getMembershipCalendarStartDay()),
                normalizePositiveAmount(body.membershipSubscriptionAmount(), profile.getMembershipSubscriptionAmount()));
        BigDecimal loanInterestRate = normalizeInterestRate(body.loanInterestRate(), profile.getLoanInterestRate());
        if (loanInterestRate == null) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_INTEREST_RATE", "Loan interest rate must be between 0 and 100 percent."));
        }
        profile.updateLoanInterestRate(loanInterestRate);
        if (body.logoDataUrl() != null) {
            String logoDataUrl = normalizeLogoDataUrl(body.logoDataUrl());
            if (logoDataUrl == null) {
                return ResponseEntity.badRequest()
                        .body(ApiErrorResponse.of(400, "INVALID_LOGO", "Logo must be a PNG, JPEG, or WebP image under 512 KB."));
            }
            profile.updateBranding(logoDataUrl);
        }
        SaccoProfile savedProfile = saccoProfileRepository.save(profile);
        auditService.record(
                tenantId,
                currentSession.user(),
                "Updated SACCO profile " + savedProfile.getLegalName(),
                "sacco_profile",
                savedProfile.getId(),
                request.getRemoteAddr());

        return ResponseEntity.ok(ApiResponse.of(SaccoProfileResponse.from(savedProfile)));
    }

    private boolean canAccessTenant(AuthService.CurrentSession currentSession, String tenantId) {
        return authService.isPlatform(currentSession.user()) || tenantId.equals(currentSession.user().getTenantId());
    }

    private ResponseEntity<ApiErrorResponse> platformRequired(String message) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "PLATFORM_ADMIN_REQUIRED", message));
    }

    private ResponseEntity<ApiErrorResponse> tenantAccessDenied(String message) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", message));
    }

    private boolean hasRequiredOfficials(String tenantId) {
        List<SaccoOfficialResponse> officials = officialResponses(tenantId);
        return officials.stream().filter(official -> official.validMember()).count() == 3
                && officials.stream().map(SaccoOfficialResponse::memberId).distinct().count() == 3;
    }

    private List<SaccoOfficialResponse> officialResponses(String tenantId) {
        List<SaccoOfficialAssignment> assignments = officialAssignmentRepository.findByTenantIdOrderByOfficeAsc(tenantId);
        return List.of(SaccoOfficialAssignment.CHAIRPERSON, SaccoOfficialAssignment.SECRETARY, SaccoOfficialAssignment.TREASURER)
                .stream()
                .map(office -> officialResponse(office, assignments))
                .toList();
    }

    private SaccoOfficialResponse officialResponse(String office, List<SaccoOfficialAssignment> assignments) {
        SaccoOfficialAssignment assignment = assignments.stream()
                .filter(candidate -> office.equals(candidate.getOffice()))
                .findFirst()
                .orElse(null);
        if (assignment == null) {
            return new SaccoOfficialResponse(office, null, null, null, null, null, false);
        }
        Member member = memberRepository.findById(assignment.getMemberId()).orElse(null);
        boolean validMember = member != null && assignment.getTenantId().equals(member.getTenantId());
        return new SaccoOfficialResponse(
                office,
                assignment.getMemberId(),
                member == null ? "" : member.getMembershipNo(),
                member == null ? "" : member.getFullName(),
                assignment.getAssignedAt(),
                assignment.getUpdatedAt(),
                validMember);
    }

    private String normalizedOffice(String office) {
        String normalized = office == null ? "" : office.trim().toLowerCase(Locale.ROOT).replace('_', '-');
        if ("chairman".equals(normalized) || SaccoOfficialAssignment.CHAIRPERSON.equals(normalized)) return SaccoOfficialAssignment.CHAIRPERSON;
        if (SaccoOfficialAssignment.SECRETARY.equals(normalized)) return SaccoOfficialAssignment.SECRETARY;
        if (SaccoOfficialAssignment.TREASURER.equals(normalized)) return SaccoOfficialAssignment.TREASURER;
        return null;
    }

    private String blankToDefault(String value) {
        return blankToDefault(value, "");
    }

    private String blankToDefault(String value, String defaultValue) {
        return value == null || value.isBlank() ? defaultValue : value.trim();
    }

    private String firstNonBlank(String requestedValue, String currentValue) {
        return requestedValue == null || requestedValue.isBlank() ? currentValue : requestedValue.trim();
    }

    private String updateOptional(String requestedValue, String currentValue) {
        return requestedValue == null ? currentValue : requestedValue.trim();
    }

    private String normalizeMembershipPeriod(String period) {
        if ("once".equalsIgnoreCase(period) || "one_time".equalsIgnoreCase(period)) return "once";
        return "monthly".equalsIgnoreCase(period) ? "monthly" : "annual";
    }

    private Integer normalizeCalendarMonth(Integer requestedValue, Integer currentValue) {
        int value = requestedValue == null ? (currentValue == null ? 1 : currentValue) : requestedValue;
        return Math.min(12, Math.max(1, value));
    }

    private Integer normalizeCalendarDay(Integer requestedValue, Integer currentValue) {
        int value = requestedValue == null ? (currentValue == null ? 1 : currentValue) : requestedValue;
        return Math.min(31, Math.max(1, value));
    }

    private BigDecimal normalizePositiveAmount(BigDecimal requestedValue, BigDecimal currentValue) {
        BigDecimal value = requestedValue == null ? (currentValue == null ? BigDecimal.valueOf(5000) : currentValue) : requestedValue;
        return value.signum() <= 0 ? BigDecimal.valueOf(5000) : value;
    }

    private BigDecimal normalizeInterestRate(BigDecimal requestedValue, BigDecimal currentValue) {
        BigDecimal value = requestedValue == null ? (currentValue == null ? BigDecimal.valueOf(1.5000) : currentValue) : requestedValue;
        if (value.signum() < 0 || value.compareTo(BigDecimal.valueOf(100)) > 0) return null;
        return value.setScale(4, java.math.RoundingMode.HALF_UP);
    }

    private String normalizeLogoDataUrl(String requestedValue) {
        String value = requestedValue == null ? "" : requestedValue.trim();
        if (value.isEmpty()) return "";
        if (value.length() > 700_000) return null;
        String lower = value.toLowerCase(Locale.ROOT);
        if (!lower.startsWith("data:image/png;base64,")
                && !lower.startsWith("data:image/jpeg;base64,")
                && !lower.startsWith("data:image/webp;base64,")) {
            return null;
        }
        return value;
    }

    private String address(String district, String parish, String village, String memberRange) {
        return "District: " + blankToDefault(district)
                + "; Parish: " + blankToDefault(parish)
                + "; Village: " + blankToDefault(village)
                + "; Member range: " + blankToDefault(memberRange);
    }

    private String generatedSaccoCode(String name) {
        String[] words = blankToDefault(name, "SACCO")
                .toUpperCase(Locale.ROOT)
                .replaceAll("[^A-Z\\s]", " ")
                .trim()
                .split("\\s+");
        List<String> usefulWords = java.util.Arrays.stream(words)
                .filter(word -> !word.isBlank())
                .filter(word -> !Set.of("SACCO", "COOPERATIVE", "COOP", "LIMITED", "LTD", "THE", "AND", "OF").contains(word))
                .toList();
        String source = usefulWords.isEmpty() ? "SACCO" : String.join("", usefulWords);
        return (source.replaceAll("[^A-Z]", "") + "SACO").substring(0, 4);
    }

    private String nextAvailableSaccoCode(String base) {
        String normalizedBase = (blankToDefault(base, "SACO").replaceAll("[^A-Z]", "") + "SACO").substring(0, 4);
        if (!codeExists(normalizedBase)) return normalizedBase;
        for (int index = 0; index < 26 * 26; index++) {
            String suffix = "" + (char) ('A' + (index / 26)) + (char) ('A' + (index % 26));
            String code = normalizedBase.substring(0, 2) + suffix;
            if (!codeExists(code)) return code;
        }
        for (int index = 0; index < 26 * 26 * 26 * 26; index++) {
            int cursor = index;
            char[] letters = new char[4];
            for (int position = 3; position >= 0; position--) {
                letters[position] = (char) ('A' + (cursor % 26));
                cursor = cursor / 26;
            }
            String code = new String(letters);
            if (!codeExists(code)) return code;
        }
        return normalizedBase;
    }

    private boolean codeExists(String code) {
        return tenantRepository.findAll().stream()
                .anyMatch(tenant -> code.equalsIgnoreCase(tenant.getAbbreviation()));
    }

    record CreateTenantRequest(
            @NotBlank String name,
            String abbreviation,
            String registrationNo,
            String district,
            String country,
            String localeCode,
            String currencyCode,
            Integer currencyDigits,
            LocalDate licenseExpiry,
            String packageId,
            String paymentStatus,
            String parish,
            String village,
            String contactNumber,
            String memberRange) {
    }

    record FleetBulkUpdateRequest(
            List<String> tenantIds,
            String status,
            String accountManagerUserId,
            String accountManagerName) {
    }

    record UpdateCollectionModeRequest(@NotBlank String allowedCollectionMode) {
    }

    record UpdateCollectionSettingsRequest(Boolean mobileMoneyActive, Boolean bankActive) {
    }

    record UpdateTenantStatusRequest(@NotBlank String status) {
    }

    record UpdateTenantDetailsRequest(
            String name,
            String registrationNo,
            String district,
            String country) {
    }

    record DeleteTenantRequest(@NotBlank String confirmCode) {
    }

    record PurgeAllTenantsRequest(@NotBlank String confirm) {
    }

    record DeleteTenantResponse(String tenantId, String name, int rowsRemoved) {
    }

        record AssignOfficialRequest(@NotBlank String memberId) {
        }

        record SaccoOfficialResponse(
            String office,
            String memberId,
            String membershipNo,
            String fullName,
            java.time.Instant assignedAt,
            java.time.Instant updatedAt,
            boolean validMember) {
        }

    record UpdateSaccoProfileRequest(
            String legalName,
            String tin,
            String umraLicenseNo,
            String cooperativeRegistrationNo,
            String address,
            @Email String email,
            String phone,
            String website,
            String membershipDuesPeriod,
            Integer membershipCalendarStartMonth,
            Integer membershipCalendarStartDay,
            BigDecimal membershipSubscriptionAmount,
            BigDecimal loanInterestRate,
            String logoDataUrl) {
    }
}
