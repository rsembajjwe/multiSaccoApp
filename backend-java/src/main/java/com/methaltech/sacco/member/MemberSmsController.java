package com.methaltech.sacco.member;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.notification.MemberSmsDeliveryService;
import com.methaltech.sacco.notification.MemberSmsWalletService;
import com.methaltech.sacco.notification.SmsMessageSegments;
import com.methaltech.sacco.security.PhoneNumberNormalizer;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/member-auth/sms")
class MemberSmsController {

    private static final int MAX_RECIPIENTS = 100;
    private final MemberAuthService memberAuthService;
    private final MemberSmsWalletService walletService;
    private final MemberSmsDeliveryService deliveryService;
    private final AuditService auditService;

    MemberSmsController(MemberAuthService memberAuthService, MemberSmsWalletService walletService,
            MemberSmsDeliveryService deliveryService, AuditService auditService) {
        this.memberAuthService = memberAuthService;
        this.walletService = walletService;
        this.deliveryService = deliveryService;
        this.auditService = auditService;
    }

    @GetMapping("/wallet")
    ResponseEntity<?> wallet(@RequestHeader(name = "Authorization", required = false) String authorization) {
        MemberAuthService.CurrentMemberSession session = memberAuthService.currentSession(authorization);
        if (session == null) return memberAuthService.authRequired();
        Member member = session.member();
        return ResponseEntity.ok(ApiResponse.of(new WalletResponse(
                walletService.balance(member.getTenantId(), member.getId()), walletService.smsRate())));
    }

    @PostMapping("/broadcast")
    ResponseEntity<?> broadcast(@RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestBody BroadcastRequest body, HttpServletRequest request) {
        MemberAuthService.CurrentMemberSession session = memberAuthService.currentSession(authorization);
        if (session == null) return memberAuthService.authRequired();
        String message = body == null || body.message() == null ? "" : body.message().trim();
        if (message.isBlank()) {
            return ResponseEntity.badRequest().body(ApiErrorResponse.of(400, "SMS_MESSAGE_REQUIRED", "Enter a message to send."));
        }
        List<String> recipients = body.recipients() == null ? List.of() : body.recipients().stream()
                .map(PhoneNumberNormalizer::normalizeUgandan)
                .filter(phone -> phone.matches("^\\+256\\d{9}$"))
                .distinct().toList();
        if (recipients.isEmpty() || recipients.size() > MAX_RECIPIENTS) {
            return ResponseEntity.badRequest().body(ApiErrorResponse.of(400, "INVALID_SMS_RECIPIENTS",
                    "Select between 1 and " + MAX_RECIPIENTS + " valid Ugandan phone numbers."));
        }
        Member member = session.member();
        int segments = SmsMessageSegments.count(message);
        int required = recipients.size() * segments;
        int balance = walletService.balance(member.getTenantId(), member.getId());
        if (balance < required) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiErrorResponse.of(409, "INSUFFICIENT_SMS_BALANCE",
                    "Your SMS balance is " + balance + ", but this message requires " + required + " credit(s)."));
        }
        String reference = "MEMBER-SMS-" + UUID.randomUUID();
        walletService.debit(member.getTenantId(), member.getId(), required, reference, "Member contact SMS broadcast");
        int sent = 0;
        for (String recipient : recipients) {
            if (deliveryService.send(recipient, message)) sent++;
        }
        int failed = recipients.size() - sent;
        if (failed > 0) {
            walletService.refund(member.getTenantId(), member.getId(), failed * segments, reference,
                    "Refund for failed member SMS delivery");
        }
        auditService.record(member.getTenantId(), member.getId(), member.getFullName(),
                "Sent personal SMS to " + sent + " selected contact(s)", "member_sms_wallet", member.getId(), request.getRemoteAddr());
        return ResponseEntity.accepted().body(ApiResponse.of(new BroadcastResponse(
                sent, failed, segments, sent * segments, walletService.balance(member.getTenantId(), member.getId()))));
    }

    record WalletResponse(int balance, BigDecimal unitPrice) {}
    record BroadcastRequest(List<String> recipients, String message) {}
    record BroadcastResponse(int sent, int failed, int segments, int creditsUsed, int balance) {}
}
