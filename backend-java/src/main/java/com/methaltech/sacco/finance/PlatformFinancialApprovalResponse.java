package com.methaltech.sacco.finance;

import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.tenant.TenantResponse;
import java.math.BigDecimal;
import java.time.Instant;

record PlatformFinancialApprovalResponse(
        String id,
        String tenantId,
        String tenantName,
        String tenantCode,
        String branchId,
        String memberId,
        String memberName,
        String membershipNo,
        String type,
        String channel,
        BigDecimal amount,
        String status,
        String reference,
        String narration,
        String makerUserId,
        Instant createdAt) {

    static PlatformFinancialApprovalResponse from(
            FinancialTransaction transaction,
            TenantResponse tenant,
            Member member) {
        return new PlatformFinancialApprovalResponse(
                transaction.getId(),
                transaction.getTenantId(),
                tenant == null ? transaction.getTenantId() : tenant.name(),
                tenant == null ? "" : tenant.abbreviation(),
                transaction.getBranchId(),
                transaction.getMemberId(),
                member == null ? transaction.getMemberId() : member.getFullName(),
                member == null ? "" : member.getMembershipNo(),
                transaction.getType(),
                transaction.getChannel(),
                transaction.getAmount(),
                transaction.getStatus(),
                transaction.getReference(),
                transaction.getNarration(),
                transaction.getMakerUserId(),
                transaction.getCreatedAt());
    }
}
