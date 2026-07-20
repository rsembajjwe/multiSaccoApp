package com.methaltech.sacco.tenant;

import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuditService;
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
    private final AuditService auditService;

    PublicSaccoRegistrationController(
            TenantRepository tenantRepository,
            SaccoProfileRepository saccoProfileRepository,
            AuditService auditService) {
        this.tenantRepository = tenantRepository;
        this.saccoProfileRepository = saccoProfileRepository;
        this.auditService = auditService;
    }

    @PostMapping
    ResponseEntity<?> registerSacco(@Valid @RequestBody PublicSaccoRegistrationRequest body, HttpServletRequest request) {
        String saccoCode = cleanCode(body.saccoCode());
        if (saccoCode.isBlank()) saccoCode = generatedSaccoCode(body.name());
        String finalSaccoCode = nextAvailableCode(saccoCode);

        Tenant tenant = tenantRepository.save(new Tenant(
                "tenant_" + UUID.randomUUID(),
                body.name().trim(),
                finalSaccoCode,
                blankToDefault(body.registrationNo()),
                blankToDefault(body.district()),
                LocalDate.now().plusYears(1),
                "pending_self_registration"));
        saccoProfileRepository.save(new SaccoProfile(
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
        String paymentReference = "MM-" + finalSaccoCode + "-" + System.currentTimeMillis() % 1_000_000;
        auditService.record(
                tenant.getId(),
                null,
                "Public SACCO registration submitted by " + tenant.getName(),
                "tenant",
                tenant.getId(),
                request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(new PublicSaccoRegistrationResponse(
                TenantResponse.from(tenant),
                paymentReference,
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
        return value == null || value.isBlank() ? "" : value.trim();
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
            @NotBlank String contactNumber,
            @NotBlank String memberRange,
            @NotBlank String paymentPhone) {
    }

    record PublicSaccoRegistrationResponse(
            TenantResponse tenant,
            String paymentReference,
            String paymentPhone,
            String paymentStatus,
            String message) {
    }
}
