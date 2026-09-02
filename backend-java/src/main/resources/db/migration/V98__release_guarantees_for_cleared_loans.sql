-- Keep historical guarantor records, but release obligations once the secured loan is fully paid.
-- This also repairs existing data where repayment history already clears a loan but the saved
-- loan balance/guarantor status had not yet been reconciled.
UPDATE loans
SET balance = 0,
    status = 'closed',
    stage = 'Closed',
    updated_at = CURRENT_TIMESTAMP
WHERE total_payable > 0
  AND status <> 'closed'
  AND COALESCE((
      SELECT SUM(r.amount)
      FROM loan_repayments r
      WHERE r.loan_id = loans.id
        AND r.status = 'posted'
  ), 0) >= total_payable;

UPDATE loan_guarantors
SET status = 'released',
    updated_at = CURRENT_TIMESTAMP
WHERE status = 'accepted'
  AND EXISTS (
      SELECT 1
      FROM loans l
      WHERE l.id = loan_guarantors.loan_id
        AND (l.status = 'closed' OR l.balance <= 0)
  );
