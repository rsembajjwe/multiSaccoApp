package com.methaltech.sacco.member;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.branch.Branch;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.security.PasswordHasher;
import com.methaltech.sacco.tenant.OrganizationRegistrationService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class PublicGroupRegistrationControllerTest {

    private final MemberRepository memberRepository = mock(MemberRepository.class);
    private final GroupOfficialRepository officialRepository = mock(GroupOfficialRepository.class);
    private final OrganizationRegistrationService registrationService = mock(OrganizationRegistrationService.class);
    private final PasswordHasher passwordHasher = mock(PasswordHasher.class);
    private final AuditService auditService = mock(AuditService.class);
    private final HttpServletRequest request = mock(HttpServletRequest.class);
    private final PublicGroupRegistrationController controller = new PublicGroupRegistrationController(
            memberRepository, officialRepository, registrationService, passwordHasher, auditService);

    @BeforeEach
    void configureDefaults() {
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        when(memberRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(officialRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void rejectsDuplicateOfficialPhonesAndEmailsAfterNormalization() {
        PublicGroupRegistrationController.OfficialRequest chairman = official("Chair", "+256 700 000001", "CHAIR@example.com");
        PublicGroupRegistrationController.OfficialRequest samePhone = official("Secretary", "+256700000001", "sec@example.com");
        PublicGroupRegistrationController.OfficialRequest treasurer = official("Treasurer", "+256700000003", "tre@example.com");
        assertError(controller.register(request(chairman, samePhone, treasurer), request),
                "DUPLICATE_GROUP_OFFICIAL");

        PublicGroupRegistrationController.OfficialRequest secretary = official("Secretary", "+256700000002", " chair@EXAMPLE.com ");
        assertError(controller.register(request(chairman, secretary, treasurer), request),
                "DUPLICATE_GROUP_OFFICIAL_EMAIL");
    }

    @Test
    void registersGroupOfficialsWithNormalizedContactsAndAudit() {
        Branch branch = mock(Branch.class);
        when(branch.getId()).thenReturn("branch_main");
        when(registrationService.register("Village Savers", "Kampala", "+256700000001", "chair@example.com"))
                .thenReturn(new OrganizationRegistrationService.Registration(
                        "tenant_village", "VIL", "Village Savers", branch, null));
        when(passwordHasher.hash(any())).thenReturn(new PasswordHasher.PasswordHash("hash", "salt"));

        ResponseEntity<?> response = controller.register(request(
                official(" Chair Person ", "+256 700 000001", " CHAIR@example.com "),
                official(" Secretary ", "+256 700 000002", " SEC@example.com "),
                official(" Treasurer ", "+256 700 000003", " TRE@example.com ")), request);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        PublicGroupRegistrationController.GroupRegistrationResponse body =
                (PublicGroupRegistrationController.GroupRegistrationResponse) ((ApiResponse<?>) response.getBody()).data();
        assertEquals("VIL-0001", body.reference());
        assertEquals("VIL", body.organizationCode());
        assertEquals("applicant", body.status());
        verify(officialRepository, org.mockito.Mockito.times(3)).save(any(GroupOfficial.class));
        verify(auditService).record(eq("tenant_village"), eq(null), any(), eq("member"),
                eq(body.memberId()), eq("127.0.0.1"));
    }

    private PublicGroupRegistrationController.GroupRegistrationRequest request(
            PublicGroupRegistrationController.OfficialRequest chairman,
            PublicGroupRegistrationController.OfficialRequest secretary,
            PublicGroupRegistrationController.OfficialRequest treasurer) {
        return new PublicGroupRegistrationController.GroupRegistrationRequest(
                "Village Savers", "Kampala", chairman, secretary, treasurer);
    }

    private PublicGroupRegistrationController.OfficialRequest official(String name, String phone, String email) {
        return new PublicGroupRegistrationController.OfficialRequest(name, phone, email);
    }

    private void assertError(ResponseEntity<?> response, String code) {
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(code, ((ApiErrorResponse) response.getBody()).error().code());
    }
}
