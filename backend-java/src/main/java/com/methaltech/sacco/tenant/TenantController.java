package com.methaltech.sacco.tenant;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
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
import java.util.Locale;
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
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tenants")
class TenantController {

    private static final Set<String> ALLOWED_STATUSES = Set.of("pending_review", "approved", "active", "inactive", "suspended", "terminated");

    private final TenantRepository tenantRepository;
    private final SaccoProfileRepository saccoProfileRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final SubscriptionService subscriptionService;
    private final AuthService authService;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final SubscriptionAccessService subscriptionAccessService;
    private final com.methaltech.sacco.finance.FundTypeProvisioningService fundTypeProvisioningService;

    TenantController(
            TenantRepository tenantRepository,
            SaccoProfileRepository saccoProfileRepository,
            SubscriptionRepository subscriptionRepository,
            SubscriptionService subscriptionService,
            AuthService authService,
            AuditService auditService,
            NotificationService notificationService,
            SubscriptionAccessService subscriptionAccessService,
            com.methaltech.sacco.finance.FundTypeProvisioningService fundTypeProvisioningService) {
        this.tenantRepository = tenantRepository;
        this.saccoProfileRepository = saccoProfileRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.subscriptionService = subscriptionService;
        this.authService = authService;
        this.auditService = auditService;
        this.notificationService = notificationService;
        this.subscriptionAccessService = subscriptionAccessService;
        this.fundTypeProvisioningService = fundTypeProvisioningService;
    }

    @GetMapping
    ResponseEntity<?> listTenants(@RequestHeader(name = "Authorization", required = false) String authorization) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "tenants:view")
                && !authService.hasPermission(currentSession.user(), "sacco-profile:manage")) {
            return authService.permissionRequired("sacco-profile:manage");
        }

        List<Tenant> tenants = authService.isPlatform(currentSession.user())
                ? tenantRepository.findAllByOrderByNameAsc()
                : tenantRepository.findById(currentSession.user().getTenantId()).stream().toList();

        return ResponseEntity.ok(ApiResponse.of(tenants.stream()
                .map(TenantResponse::from)
                .toList()));
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
        tenant.activate();
        Tenant savedTenant = tenantRepository.save(tenant);
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
        subscriptionRepository.save(subscriptionService.createInitialSubscription(
                savedTenant.getId(),
                savedTenant.getPackageId(),
                paid));
        // Seed the three built-in fund sources so the new SACCO's fund registry is ready to use.
        fundTypeProvisioningService.seedDefaults(savedTenant.getId(), currentSession.user().getId());

        auditService.record(
                savedTenant.getId(),
                currentSession.user(),
                "Created SACCO " + savedTenant.getName() + " with subscription payment " + (paid ? "paid" : "pending"),
                "tenant",
                savedTenant.getId(),
                request.getRemoteAddr());
        notificationService.notifySaccoContact(
                savedTenant.getId(),
                paid ? "sacco_created_active" : "sacco_created_pending_payment",
                paid ? "SACCO account activated" : "SACCO one-month setup trial activated",
                paid
                        ? savedTenant.getName() + " has been created and activated on Tereka Online."
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
                firstNonBlank(body.cooperativeRegistrationNo(), profile.getCooperativeRegistrationNo()),
                updateOptional(body.address(), profile.getAddress()),
                updateOptional(body.email(), profile.getEmail()),
                updateOptional(body.phone(), profile.getPhone()),
                updateOptional(body.website(), profile.getWebsite()));
        profile.updateMembershipCalendar(
                normalizeMembershipPeriod(firstNonBlank(body.membershipDuesPeriod(), profile.getMembershipDuesPeriod())),
                normalizeCalendarMonth(body.membershipCalendarStartMonth(), profile.getMembershipCalendarStartMonth()),
                normalizeCalendarDay(body.membershipCalendarStartDay(), profile.getMembershipCalendarStartDay()),
                normalizePositiveAmount(body.membershipSubscriptionAmount(), profile.getMembershipSubscriptionAmount()));
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

    record UpdateCollectionModeRequest(@NotBlank String allowedCollectionMode) {
    }

    record UpdateCollectionSettingsRequest(Boolean mobileMoneyActive, Boolean bankActive) {
    }

    record UpdateTenantStatusRequest(@NotBlank String status) {
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
            BigDecimal membershipSubscriptionAmount) {
    }
}
