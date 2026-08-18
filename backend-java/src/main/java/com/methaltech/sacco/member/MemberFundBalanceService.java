package com.methaltech.sacco.member;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

/**
 * Keeps the per-member, per-fund balance ledger ({@link MemberFundBalance}) in step with posted
 * transactions. Base fund types mirror the columns on {@link Member}; custom contributions
 * ({@code <fundCode>_contribution} / {@code <fundCode>_deposit}) move the ledger only. Public so the
 * finance posting flow (a different package) can drive it while the entity/repository stay internal.
 */
@Service
public class MemberFundBalanceService {

    private static final Pattern CUSTOM_CONTRIBUTION = Pattern.compile("^([a-z][a-z0-9_]*)_(?:contribution|deposit)$");

    private final MemberFundBalanceRepository repository;

    MemberFundBalanceService(MemberFundBalanceRepository repository) {
        this.repository = repository;
    }

    /** The fund a transaction type contributes to, or null when the type has no fund-balance effect. */
    public static String fundCodeForType(String type) {
        if (type == null) return null;
        switch (type) {
            case "savings_deposit":
            case "withdrawal":
                return "savings";
            case "share_purchase":
                return "shares";
            case "welfare_contribution":
                return "welfare";
            case "loan_repayment":
                return null;
            default:
                Matcher matcher = CUSTOM_CONTRIBUTION.matcher(type);
                return matcher.matches() ? matcher.group(1) : null;
        }
    }

    public List<MemberFundBalance> balancesFor(String memberId) {
        return repository.findByMemberIdOrderByFundCodeAsc(memberId);
    }

    public void applyPosted(String tenantId, String memberId, String type, BigDecimal amount) {
        apply(tenantId, memberId, type, signedDelta(type, amount));
    }

    public void applyReversal(String tenantId, String memberId, String type, BigDecimal amount) {
        apply(tenantId, memberId, type, signedDelta(type, amount).negate());
    }

    /** Welfare claim payouts reduce the member's welfare fund balance. */
    public void applyWelfareClaimPayment(String tenantId, String memberId, BigDecimal amount) {
        creditFund(tenantId, memberId, "welfare", amount.negate());
    }

    public void creditFund(String tenantId, String memberId, String fundCode, BigDecimal delta) {
        if (fundCode == null || delta == null || delta.signum() == 0) return;
        MemberFundBalance balance = repository.findByMemberIdAndFundCode(memberId, fundCode)
                .orElseGet(() -> new MemberFundBalance("mfb_" + UUID.randomUUID(), tenantId, memberId, fundCode, BigDecimal.ZERO));
        balance.addAmount(delta);
        repository.save(balance);
    }

    private void apply(String tenantId, String memberId, String type, BigDecimal delta) {
        creditFund(tenantId, memberId, fundCodeForType(type), delta);
    }

    private static BigDecimal signedDelta(String type, BigDecimal amount) {
        BigDecimal value = amount == null ? BigDecimal.ZERO : amount;
        return "withdrawal".equals(type) ? value.negate() : value;
    }
}
