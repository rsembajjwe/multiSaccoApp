package com.methaltech.sacco.tenant;

import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.notification.NotificationService;
import com.methaltech.sacco.subscription.Subscription;
import com.methaltech.sacco.subscription.SubscriptionRepository;
import com.methaltech.sacco.subscription.SubscriptionResponse;
import com.methaltech.sacco.subscription.SubscriptionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/sacco-registrations")
class PublicSaccoRegistrationController {

    private final TenantRepository tenantRepository;
    private final SaccoProfileRepository saccoProfileRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final SubscriptionService subscriptionService;
    private final AuditService auditService;
    private final NotificationService notificationService;

    PublicSaccoRegistrationController(
            TenantRepository tenantRepository,
            SaccoProfileRepository saccoProfileRepository,
            SubscriptionRepository subscriptionRepository,
            SubscriptionService subscriptionService,
            AuditService auditService,
            NotificationService notificationService) {
        this.tenantRepository = tenantRepository;
        this.saccoProfileRepository = saccoProfileRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.subscriptionService = subscriptionService;
        this.auditService = auditService;
        this.notificationService = notificationService;
    }

    @PostMapping
    ResponseEntity<?> registerSacco(@Valid @RequestBody PublicSaccoRegistrationRequest body, HttpServletRequest request) {
        String saccoCode = cleanCode(body.saccoCode());
        if (saccoCode.isBlank()) saccoCode = generatedSaccoCode(body.name());
        String finalSaccoCode = nextAvailableCode(saccoCode);

        Tenant tenant = new Tenant(
                "tenant_" + UUID.randomUUID(),
                body.name().trim(),
                finalSaccoCode,
                blankToDefault(body.registrationNo()),
                blankToDefault(body.district()),
                blankToDefault(body.country(), "Uganda"),
                blankToDefault(body.localeCode(), "en-UG"),
                blankToDefault(body.currencyCode(), "UGX").toUpperCase(),
                body.currencyDigits() == null ? 0 : body.currencyDigits(),
                LocalDate.now().plusYears(1),
                "starter");
        tenant.updateStatus("pending_self_registration");
        tenant = tenantRepository.save(tenant);
        SaccoProfile profile = saccoProfileRepository.save(new SaccoProfile(
                "profile_" + UUID.randomUUID(),
                tenant.getId(),
                tenant.getName(),
                "",
                "",
                tenant.getRegistrationNo(),
                address(body.district(), body.parish(), body.village(), body.memberRange()),
                "",
                blankToDefault(body.contactNumber()),
                ""));
        Subscription subscription = subscriptionRepository.save(subscriptionService.createInitialSubscription(
                tenant.getId(),
                "starter",
                false));
        String paymentReference = "MM-" + finalSaccoCode + "-" + System.currentTimeMillis() % 1_000_000;
        auditService.record(
                tenant.getId(),
                null,
                "Public SACCO registration submitted by " + tenant.getName(),
                "tenant",
                tenant.getId(),
                request.getRemoteAddr());
        notificationService.notifySaccoContact(
                tenant.getId(),
                "public_sacco_registration_received",
                "SACCO registration received",
                "Your Tereka Online SACCO registration was received. Complete the mobile-money subscription payment using reference " + paymentReference + " for approval review.",
                "tenant",
                tenant.getId(),
                blankToDefault(body.paymentPhone()).isBlank() ? profile.getPhone() : blankToDefault(body.paymentPhone()),
                profile.getEmail());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(new PublicSaccoRegistrationResponse(
                TenantResponse.from(tenant),
                SubscriptionResponse.from(subscription),
                paymentReference,
                subscription.getAmount(),
                tenant.getCurrencyCode(),
                blankToDefault(body.paymentPhone()).isBlank() ? blankToDefault(body.contactNumber()) : blankToDefault(body.paymentPhone()),
                "payment_initiated",
                "Registration received. Mobile-money payment is initiated; platform approval follows payment confirmation.")));
    }

    private String generatedSaccoCode(String name) {
        String letters = name == null ? "" : name.replaceAll("[^A-Za-z]", "").toUpperCase(Locale.ROOT);
        if (letters.length() >= 3) return letters.substring(0, 3);
        return (letters + "SAC").substring(0, 3);
    }

    private String cleanCode(String value) {
        return value == null ? "" : value.replaceAll("[^A-Za-z0-9]", "").toUpperCase(Locale.ROOT);
    }

    private String nextAvailableCode(String requestedCode) {
        String base = requestedCode.length() >= 3 ? requestedCode : (requestedCode + "SAC").substring(0, 3);
        String code = base;
        int suffix = 2;
        while (codeExists(code)) {
            String suffixText = String.valueOf(suffix);
            code = base.substring(0, Math.max(1, Math.min(base.length(), 8 - suffixText.length()))) + suffixText;
            suffix++;
        }
        return code;
    }

    private boolean codeExists(String code) {
        return tenantRepository.findAll().stream()
                .anyMatch(tenant -> code.equalsIgnoreCase(tenant.getAbbreviation()));
    }

    private String blankToDefault(String value) {
        return blankToDefault(value, "");
    }

    private String blankToDefault(String value, String defaultValue) {
        return value == null || value.isBlank() ? defaultValue : value.trim();
    }

    private String address(String district, String parish, String village, String memberRange) {
        return "District: " + blankToDefault(district)
                + "; Parish: " + blankToDefault(parish)
                + "; Village: " + blankToDefault(village)
                + "; Member range: " + blankToDefault(memberRange);
    }

    record PublicSaccoRegistrationRequest(
            @NotBlank String name,
            String saccoCode,
            @NotBlank String registrationNo,
            @NotBlank String district,
            @NotBlank String parish,
            @NotBlank String village,
            String country,
            String localeCode,
            String currencyCode,
            Integer currencyDigits,
            @NotBlank String contactNumber,
            @NotBlank String memberRange,
            @NotBlank String paymentPhone) {
    }

    record PublicSaccoRegistrationResponse(
            TenantResponse tenant,
            SubscriptionResponse subscription,
            String paymentReference,
            java.math.BigDecimal paymentAmount,
            String currencyCode,
            String paymentPhone,
            String paymentStatus,
            String message) {
    }
}
