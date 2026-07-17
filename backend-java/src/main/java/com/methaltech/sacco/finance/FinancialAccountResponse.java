package com.methaltech.sacco.finance;

import com.methaltech.sacco.member.Member;
import java.time.Instant;
import lombok.Builder;

@Builder
record FinancialAccountResponse(
        String id,
        String tenantId,
        String memberId,
        String membershipNo,
        String memberName,
        String productId,
        String productCode,
        String productName,
        String accountType,
        String accountNo,
        String status,
        String openedByUserId,
        Instant openedAt,
        Instant updatedAt) {

    static FinancialAccountResponse from(FinancialAccount account, Member member, FinancialProduct product) {
        return FinancialAccountResponse.builder()
                .id(account.getId())
                .tenantId(account.getTenantId())
                .memberId(account.getMemberId())
                .membershipNo(member == null ? null : member.getMembershipNo())
                .memberName(member == null ? null : member.getFullName())
                .productId(account.getProductId())
                .productCode(product == null ? null : product.getCode())
                .productName(product == null ? null : product.getName())
                .accountType(account.getAccountType())
                .accountNo(account.getAccountNo())
                .status(account.getStatus())
                .openedByUserId(account.getOpenedByUserId())
                .openedAt(account.getOpenedAt())
                .updatedAt(account.getUpdatedAt())
                .build();
    }
}
