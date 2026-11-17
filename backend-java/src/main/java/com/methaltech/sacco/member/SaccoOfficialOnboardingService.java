package com.methaltech.sacco.member;

import com.methaltech.sacco.branch.Branch;
import com.methaltech.sacco.identity.OfficialStaffAccountService;
import com.methaltech.sacco.identity.User;
import com.methaltech.sacco.security.PasswordHasher;
import com.methaltech.sacco.security.PhoneNumberNormalizer;
import com.methaltech.sacco.tenant.SaccoOfficialAssignment;
import com.methaltech.sacco.tenant.SaccoOfficialAssignmentRepository;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SaccoOfficialOnboardingService {

    private static final Set<String> OFFICES = Set.of("chairperson", "treasurer", "secretary");

    private final MemberRepository memberRepository;
    private final SaccoOfficialAssignmentRepository assignmentRepository;
    private final OfficialStaffAccountService staffAccountService;
    private final PasswordHasher passwordHasher;

    SaccoOfficialOnboardingService(
            MemberRepository memberRepository,
            SaccoOfficialAssignmentRepository assignmentRepository,
            OfficialStaffAccountService staffAccountService,
            PasswordHasher passwordHasher) {
        this.memberRepository = memberRepository;
        this.assignmentRepository = assignmentRepository;
        this.staffAccountService = staffAccountService;
        this.passwordHasher = passwordHasher;
    }

    @Transactional
    public List<Member> onboard(
            String tenantId,
            String saccoCode,
            String address,
            Branch branch,
            List<OfficialInput> officials,
            String createdByUserId) {
        validate(officials);
        long sequence = memberRepository.countByTenantId(tenantId) + 1;
        java.util.ArrayList<Member> created = new java.util.ArrayList<>();
        for (OfficialInput input : officials) {
            String email = normalizeEmail(input.email());
            String phone = normalizePhone(input.phone());
            String channel = input.deliveryChannel().trim().toLowerCase(Locale.ROOT);
            String membershipNo = nextMembershipNo(tenantId, saccoCode, sequence++);
            PasswordHasher.PasswordHash memberPassword = passwordHasher.hash(UUID.randomUUID().toString());
            Member member = memberRepository.save(new Member(
                    "member_" + UUID.randomUUID(),
                    tenantId,
                    branch.getId(),
                    membershipNo,
                    input.fullName().trim(),
                    "individual",
                    phone,
                    email,
                    address,
                    "",
                    memberPassword.hash(),
                    memberPassword.salt(),
                    "active",
                    "verified",
                    LocalDate.now()));
            assignmentRepository.save(new SaccoOfficialAssignment(
                    "official_assignment_" + UUID.randomUUID(),
                    tenantId,
                    input.office().trim().toLowerCase(Locale.ROOT),
                    member.getId(),
                    createdByUserId));
            User user = staffAccountService.create(
                    tenantId,
                    input.office(),
                    input.fullName().trim(),
                    email.isBlank() ? null : email,
                    phone,
                    channel,
                    createdByUserId);
            member.linkStaffUser(user.getId());
            created.add(memberRepository.save(member));
        }
        return List.copyOf(created);
    }

    public void validate(List<OfficialInput> officials) {
        if (officials == null || officials.size() != 3
                || !officials.stream()
                        .map(input -> input.office() == null ? "" : input.office().trim().toLowerCase(Locale.ROOT))
                        .collect(java.util.stream.Collectors.toSet())
                        .equals(OFFICES)) {
            throw new IllegalArgumentException("Chairperson, treasurer, and secretary details are required.");
        }
        Set<String> emails = new HashSet<>();
        Set<String> phones = new HashSet<>();
        for (OfficialInput input : officials) {
            String email = normalizeEmail(input.email());
            String phone = normalizePhone(input.phone());
            String channel = input.deliveryChannel() == null ? "" : input.deliveryChannel().trim().toLowerCase(Locale.ROOT);
            if (input.fullName() == null || input.fullName().isBlank() || (email.isBlank() && phone.isBlank())) {
                throw new IllegalArgumentException("Every official requires a name and an active email address or phone number.");
            }
            if (!email.isBlank() && !email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
                throw new IllegalArgumentException("Every supplied official email address must be valid.");
            }
            if (!Set.of("email", "sms").contains(channel)
                    || ("email".equals(channel) && email.isBlank())
                    || ("sms".equals(channel) && !phone.matches("^\\+[1-9]\\d{7,14}$"))) {
                throw new IllegalArgumentException("Each official needs a valid temporary-password delivery channel.");
            }
            if (!email.isBlank() && !emails.add(email)) {
                throw new IllegalArgumentException("Officials must use different email addresses.");
            }
            if (!phone.isBlank() && !phones.add(phone)) {
                throw new IllegalArgumentException("Officials must use different phone numbers.");
            }
        }
    }

    private String nextMembershipNo(String tenantId, String saccoCode, long sequence) {
        String prefix = saccoCode == null || saccoCode.isBlank() ? "SACCO" : saccoCode.trim().toUpperCase(Locale.ROOT);
        String membershipNo;
        do {
            membershipNo = prefix + "-" + String.format("%04d", sequence++);
        } while (memberRepository.existsByTenantIdAndMembershipNoIgnoreCase(tenantId, membershipNo));
        return membershipNo;
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizePhone(String phone) {
        return PhoneNumberNormalizer.normalizeUgandan(phone);
    }

    public record OfficialInput(
            String office,
            String fullName,
            String email,
            String phone,
            String deliveryChannel) {
    }
}
