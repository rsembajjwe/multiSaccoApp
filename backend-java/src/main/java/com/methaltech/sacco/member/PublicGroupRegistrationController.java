package com.methaltech.sacco.member;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.branch.Branch;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.security.PasswordHasher;
import com.methaltech.sacco.tenant.OrganizationRegistrationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/group-registrations")
class PublicGroupRegistrationController {

    private final MemberRepository memberRepository;
    private final GroupOfficialRepository groupOfficialRepository;
    private final OrganizationRegistrationService organizationRegistrationService;
    private final PasswordHasher passwordHasher;
    private final AuditService auditService;

    PublicGroupRegistrationController(
            MemberRepository memberRepository,
            GroupOfficialRepository groupOfficialRepository,
            OrganizationRegistrationService organizationRegistrationService,
            PasswordHasher passwordHasher,
            AuditService auditService) {
        this.memberRepository = memberRepository;
        this.groupOfficialRepository = groupOfficialRepository;
        this.organizationRegistrationService = organizationRegistrationService;
        this.passwordHasher = passwordHasher;
        this.auditService = auditService;
    }

    @PostMapping
    @Transactional
    ResponseEntity<?> register(
            @Valid @RequestBody GroupRegistrationRequest body,
            HttpServletRequest request) {
        String chairmanPhone = normalizePhone(body.chairman().phone());
        Set<String> officialPhones = new HashSet<>(List.of(
                normalizePhone(body.chairman().phone()),
                normalizePhone(body.secretary().phone()),
                normalizePhone(body.treasurer().phone())));
        if (officialPhones.size() != 3) {
            return ResponseEntity.badRequest().body(ApiErrorResponse.of(
                    400, "DUPLICATE_GROUP_OFFICIAL", "Each group official must have a different contact number."));
        }
        Set<String> officialEmails = new HashSet<>(List.of(
                normalizeEmail(body.chairman().email()),
                normalizeEmail(body.secretary().email()),
                normalizeEmail(body.treasurer().email())));
        if (officialEmails.size() != 3) {
            return ResponseEntity.badRequest().body(ApiErrorResponse.of(
                    400, "DUPLICATE_GROUP_OFFICIAL_EMAIL", "Each group official must have a different email address."));
        }

        OrganizationRegistrationService.Registration registration = organizationRegistrationService.register(
                body.groupName(),
                body.address(),
                chairmanPhone,
                normalizeEmail(body.chairman().email()));
        String tenantId = registration.tenantId();
        Branch branch = registration.branch();
        String memberId = "member_" + UUID.randomUUID();
        String membershipNo = registration.organizationCode() + "-0001";
        PasswordHasher.PasswordHash password = passwordHasher.hash(UUID.randomUUID().toString());
        Member group = memberRepository.save(new Member(
                memberId,
                tenantId,
                branch.getId(),
                membershipNo,
                body.groupName().trim(),
                "group",
                chairmanPhone,
                "",
                body.address().trim(),
                "",
                password.hash(),
                password.salt(),
                "applicant",
                "pending_verification",
                LocalDate.now()));

        List<OfficialRequest> officials = List.of(body.chairman(), body.secretary(), body.treasurer());
        List<String> roles = List.of("chairman", "secretary", "treasurer");
        for (int index = 0; index < roles.size(); index++) {
            OfficialRequest official = officials.get(index);
            groupOfficialRepository.save(new GroupOfficial(
                    "official_" + UUID.randomUUID(),
                    tenantId,
                    group.getId(),
                    roles.get(index),
                    official.fullName().trim(),
                    normalizePhone(official.phone()),
                    normalizeEmail(official.email())));
        }

        auditService.record(
                tenantId,
                null,
                "Public group registration submitted for " + group.getFullName(),
                "member",
                group.getId(),
                request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(new GroupRegistrationResponse(
                group.getId(),
                membershipNo,
                registration.organizationCode(),
                "applicant",
                "Registration submitted for platform approval.")));
    }

    record GroupRegistrationRequest(
            @NotBlank @Size(max = 160) String groupName,
            @NotBlank @Size(max = 240) String address,
            @NotNull @Valid OfficialRequest chairman,
            @NotNull @Valid OfficialRequest secretary,
            @NotNull @Valid OfficialRequest treasurer) {
    }

    record OfficialRequest(
            @NotBlank @Size(max = 160) String fullName,
            @NotBlank @Size(max = 40)
            @Pattern(regexp = "^[+0-9][0-9 ]{6,39}$", message = "must be a valid phone number") String phone,
            @NotBlank @Email @Size(max = 160) String email) {
    }

    record GroupRegistrationResponse(
            String memberId,
            String reference,
            String organizationCode,
            String status,
            String message) {
    }

    private String normalizePhone(String phone) {
        return phone.replace(" ", "").trim();
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
