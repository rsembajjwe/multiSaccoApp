package com.methaltech.sacco.notification;

import com.methaltech.sacco.loan.Loan;
import com.methaltech.sacco.loan.LoanRepository;
import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberRepository;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
class SaccoSmsBroadcastService {

    private static final List<String> OPEN_LOAN_STATUSES = List.of("active", "overdue", "defaulted", "disbursed");
    private final MemberRepository memberRepository;
    private final LoanRepository loanRepository;
    private final SmsWalletService smsWalletService;
    private final NotificationService notificationService;

    Preview preview(String tenantId, List<String> memberIds, String mode, String body) {
        List<Member> recipients = recipients(tenantId, memberIds);
        Map<String, String> messages = messages(tenantId, recipients, mode, body);
        int credits = messages.values().stream().mapToInt(SmsMessageSegments::count).sum();
        return new Preview(recipients, messages, credits, smsWalletService.balance(tenantId));
    }

    SendResult send(String tenantId, List<String> memberIds, String mode, String title, String body) {
        Preview preview = preview(tenantId, memberIds, mode, body);
        if (preview.recipients().isEmpty()) {
            throw new IllegalArgumentException("No members with phone numbers were found.");
        }
        String reference = "SMS-BCAST-" + UUID.randomUUID();
        smsWalletService.debit(tenantId, preview.requiredCredits(), reference, "SACCO SMS broadcast");
        int sent = 0;
        int consumed = 0;
        try {
            for (Member recipient : preview.recipients()) {
                String message = preview.messages().get(recipient.getId());
                int segments = SmsMessageSegments.count(message);
                if (!notificationService.notifySmsBroadcast(tenantId, List.of(recipient), title, message).isEmpty()) {
                    sent++;
                    consumed += segments;
                }
            }
        } catch (RuntimeException exception) {
            smsWalletService.refund(tenantId, preview.requiredCredits() - consumed, reference, "Unsent SACCO SMS credits");
            throw exception;
        }
        if (consumed < preview.requiredCredits()) {
            smsWalletService.refund(tenantId, preview.requiredCredits() - consumed, reference, "Unused SACCO SMS credits");
        }
        return new SendResult(sent, consumed, smsWalletService.balance(tenantId));
    }

    private List<Member> recipients(String tenantId, List<String> memberIds) {
        List<Member> candidates = memberIds == null || memberIds.isEmpty()
                ? memberRepository.findByTenantIdOrderByMembershipNoAsc(tenantId)
                : memberRepository.findAllById(memberIds).stream()
                        .filter(member -> tenantId.equals(member.getTenantId()))
                        .toList();
        return candidates.stream()
                .filter(member -> member.getPhone() != null && !member.getPhone().isBlank())
                .toList();
    }

    private Map<String, String> messages(String tenantId, List<Member> recipients, String mode, String body) {
        Map<String, String> messages = new LinkedHashMap<>();
        if (!"account_status".equals(mode)) {
            recipients.forEach(member -> messages.put(member.getId(), body));
            return messages;
        }
        List<String> memberIds = recipients.stream().map(Member::getId).toList();
        Map<String, BigDecimal> loanBalances = new java.util.HashMap<>();
        loanRepository.findByMemberIdInAndStatusIn(memberIds, OPEN_LOAN_STATUSES).forEach(loan ->
                loanBalances.merge(loan.getMemberId(), loan.getBalance(), BigDecimal::add));
        for (Member member : recipients) {
            String prefix = body == null || body.isBlank() ? "" : body.trim() + " ";
            messages.put(member.getId(), prefix + "Hello " + member.getFullName()
                    + ". Account: " + member.getStatus()
                    + ". Savings: UGX " + member.getSavingsBalance().toPlainString()
                    + ". Loan balance: UGX " + loanBalances.getOrDefault(member.getId(), BigDecimal.ZERO).toPlainString() + ".");
        }
        return messages;
    }

    record Preview(List<Member> recipients, Map<String, String> messages, int requiredCredits, int availableCredits) {
    }

    record SendResult(int recipients, int creditsUsed, int smsBalance) {
    }
}
