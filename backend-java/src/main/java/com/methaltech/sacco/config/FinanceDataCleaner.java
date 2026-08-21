package com.methaltech.sacco.config;

import java.util.Arrays;
import java.util.UUID;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(name = "sacco.dev.clear-finance-data", havingValue = "true")
class FinanceDataCleaner implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;
    private final Environment environment;

    FinanceDataCleaner(JdbcTemplate jdbcTemplate, Environment environment) {
        this.jdbcTemplate = jdbcTemplate;
        this.environment = environment;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (Arrays.stream(environment.getActiveProfiles()).anyMatch("prod"::equalsIgnoreCase)) {
            throw new IllegalStateException("Refusing to clear finance data while the prod profile is active.");
        }

        int affected = 0;
        affected += jdbcTemplate.update("""
                DELETE FROM notification_deliveries
                WHERE notification_id IN (
                    SELECT id FROM notifications
                    WHERE event_type IN (
                        'payment_received',
                        'loan_repayment_received',
                        'payment_pending_approval',
                        'payment_request_closed',
                        'loan_application_submitted',
                        'loan_guarantor_requested',
                        'loan_guarantor_accepted',
                        'loan_guarantor_rejected'
                    )
                    OR resource_type IN (
                        'financial_transaction',
                        'loan',
                        'loan_repayment',
                        'loan_guarantor',
                        'mobile_money_payment_request',
                        'welfare_claim',
                        'savings_transfer'
                    )
                )
                """);
        affected += jdbcTemplate.update("""
                DELETE FROM notifications
                WHERE event_type IN (
                    'payment_received',
                    'loan_repayment_received',
                    'payment_pending_approval',
                    'payment_request_closed',
                    'loan_application_submitted',
                    'loan_guarantor_requested',
                    'loan_guarantor_accepted',
                    'loan_guarantor_rejected'
                )
                OR resource_type IN (
                    'financial_transaction',
                    'loan',
                    'loan_repayment',
                    'loan_guarantor',
                    'mobile_money_payment_request',
                    'welfare_claim',
                    'savings_transfer'
                )
                """);
        affected += jdbcTemplate.update("""
                DELETE FROM mobile_money_callbacks
                WHERE purpose IN (
                    'savings_deposit',
                    'share_purchase',
                    'welfare_contribution',
                    'loan_repayment',
                    'membership_dues'
                )
                OR resource_type IN (
                    'financial_transaction',
                    'loan_repayment',
                    'member_subscription'
                )
                """);
        affected += jdbcTemplate.update("""
                DELETE FROM mobile_money_payment_requests
                WHERE purpose IN (
                    'savings_deposit',
                    'share_purchase',
                    'welfare_contribution',
                    'loan_repayment',
                    'membership_dues'
                )
                """);
        affected += jdbcTemplate.update("""
                DELETE FROM statement_lines
                WHERE channel IN ('mobile_money', 'bank', 'cash')
                   OR LOWER(description) LIKE '%savings%'
                   OR LOWER(description) LIKE '%shares%'
                   OR LOWER(description) LIKE '%welfare%'
                   OR LOWER(description) LIKE '%loan%'
                """);
        affected += jdbcTemplate.update("DELETE FROM savings_transfers");
        affected += jdbcTemplate.update("DELETE FROM welfare_claims");
        affected += jdbcTemplate.update("DELETE FROM loan_appraisals");
        affected += jdbcTemplate.update("DELETE FROM loan_repayment_schedules");
        affected += jdbcTemplate.update("DELETE FROM loan_repayments");
        affected += jdbcTemplate.update("DELETE FROM loan_guarantors");
        affected += jdbcTemplate.update("DELETE FROM loans");
        affected += jdbcTemplate.update("""
                UPDATE financial_transactions
                SET original_transaction_id = NULL
                WHERE original_transaction_id IS NOT NULL
                """);
        affected += jdbcTemplate.update("""
                DELETE FROM financial_transactions
                WHERE type IN (
                    'savings_deposit',
                    'share_purchase',
                    'welfare_contribution',
                    'loan_repayment',
                    'withdrawal'
                )
                """);
        affected += jdbcTemplate.update("""
                UPDATE member_fund_balances
                SET balance = 0,
                    updated_at = CURRENT_TIMESTAMP
                WHERE fund_code IN ('savings', 'shares', 'welfare')
                """);
        affected += jdbcTemplate.update("""
                UPDATE members
                SET savings_balance = 0,
                    shares_balance = 0,
                    welfare_balance = 0,
                    savings_hold = 0
                """);

        jdbcTemplate.update("""
                INSERT INTO audit_events (
                    id,
                    tenant_id,
                    actor_user_id,
                    actor_name,
                    action,
                    resource_type,
                    resource_id,
                    ip_address
                ) VALUES (?, 'tenant_platform', NULL, 'System', ?, 'finance_data_cleaner', ?, 'startup')
                """,
                "audit_finance_data_cleaner_" + UUID.randomUUID(),
                "Cleared member savings, shares, welfare, and loan operating data for fresh local entry.",
                String.valueOf(affected));
    }
}
