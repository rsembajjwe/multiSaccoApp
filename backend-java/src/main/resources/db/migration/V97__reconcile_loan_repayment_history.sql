-- Backfill missing posted repayment rows for loans whose saved balance already reflects more
-- repayments than the visible loan_repayments history. This keeps member loan history,
-- outstanding balance and reports aligned after earlier demo/finance postings.
INSERT INTO loan_repayments (
    id,
    tenant_id,
    loan_id,
    member_id,
    amount,
    channel,
    reference,
    narration,
    received_by_user_id,
    status,
    approved_by_user_id,
    approved_at,
    received_at,
    created_at
)
SELECT
    SUBSTRING('repayment_reconcile_' || l.id FROM 1 FOR 64),
    l.tenant_id,
    l.id,
    l.member_id,
    (l.total_payable - l.balance) - COALESCE(SUM(r.amount), 0),
    'cash',
    SUBSTRING('LR-RECON-' || l.id FROM 1 FOR 96),
    'Loan repayment history reconciliation',
    COALESCE(l.disbursed_by_user_id, l.approved_by_user_id),
    'posted',
    COALESCE(l.disbursed_by_user_id, l.approved_by_user_id),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM loans l
LEFT JOIN loan_repayments r ON r.loan_id = l.id AND r.status = 'posted'
WHERE l.total_payable > 0
  AND COALESCE(l.disbursed_by_user_id, l.approved_by_user_id) IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM loan_repayments existing
      WHERE existing.tenant_id = l.tenant_id
        AND existing.reference = SUBSTRING('LR-RECON-' || l.id FROM 1 FOR 96)
  )
GROUP BY
    l.id,
    l.tenant_id,
    l.member_id,
    l.total_payable,
    l.balance,
    l.disbursed_by_user_id,
    l.approved_by_user_id
HAVING (l.total_payable - l.balance) - COALESCE(SUM(r.amount), 0) > 0.01;
