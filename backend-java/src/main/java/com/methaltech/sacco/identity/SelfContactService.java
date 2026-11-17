package com.methaltech.sacco.identity;

import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberRepository;
import com.methaltech.sacco.security.PhoneNumberNormalizer;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class SelfContactService {

    private final UserRepository userRepository;
    private final MemberRepository memberRepository;

    SelfContactService(UserRepository userRepository, MemberRepository memberRepository) {
        this.userRepository = userRepository;
        this.memberRepository = memberRepository;
    }

    @Transactional
    User update(User user, String requestedEmail, String requestedPhone) {
        String email = requestedEmail == null ? "" : requestedEmail.trim().toLowerCase(Locale.ROOT);
        String phone = PhoneNumberNormalizer.normalizeUgandan(requestedPhone);
        if (email.isBlank() || !email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
            throw new ContactUpdateException("INVALID_EMAIL", "Enter a valid email address.");
        }
        if (!phone.matches("^\\+?[0-9]{9,15}$")) {
            throw new ContactUpdateException("INVALID_PHONE", "Enter a valid telephone number including the country code.");
        }
        if (userRepository.existsByTenantIdAndIdNotAndEmailIgnoreCase(user.getTenantId(), user.getId(), email)) {
            throw new ContactUpdateException("EMAIL_IN_USE", "That email address is already used by another account.");
        }
        if (userRepository.existsByTenantIdAndIdNotAndPhone(user.getTenantId(), user.getId(), phone)) {
            throw new ContactUpdateException("PHONE_IN_USE", "That telephone number is already used by another account.");
        }

        Member linkedMember = memberRepository.findFirstByLinkedUserId(user.getId()).orElse(null);
        if (linkedMember != null) {
            if (memberRepository.existsByTenantIdAndIdNotAndEmailIgnoreCase(
                    linkedMember.getTenantId(), linkedMember.getId(), email)) {
                throw new ContactUpdateException("EMAIL_IN_USE", "That email address is already used by another member.");
            }
            if (memberRepository.existsByTenantIdAndIdNotAndPhoneIgnoreCase(
                    linkedMember.getTenantId(), linkedMember.getId(), phone)) {
                throw new ContactUpdateException("PHONE_IN_USE", "That telephone number is already used by another member.");
            }
            linkedMember.updateContact(phone, linkedMember.getWhatsapp(), email);
            memberRepository.save(linkedMember);
        }

        user.updateOwnContact(email, phone);
        return userRepository.save(user);
    }

    static final class ContactUpdateException extends RuntimeException {
        private final String code;

        ContactUpdateException(String code, String message) {
            super(message);
            this.code = code;
        }

        String code() {
            return code;
        }
    }
}
