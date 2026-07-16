CREATE TABLE chart_of_accounts (
    code VARCHAR(16) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    type VARCHAR(32) NOT NULL,
    normal_balance VARCHAR(16) NOT NULL
);

INSERT INTO chart_of_accounts (code, name, type, normal_balance) VALUES
    ('1000', 'Cash on Hand', 'asset', 'debit'),
    ('1010', 'Bank Account', 'asset', 'debit'),
    ('1020', 'Mobile Money Wallet', 'asset', 'debit'),
    ('1030', 'Payroll Clearing', 'asset', 'debit'),
    ('1100', 'Loans Receivable', 'asset', 'debit'),
    ('1300', 'Fixed Assets', 'asset', 'debit'),
    ('1310', 'Accumulated Depreciation', 'asset', 'credit'),
    ('2000', 'Member Savings', 'liability', 'credit'),
    ('2100', 'Member Share Capital', 'equity', 'credit'),
    ('2200', 'Welfare Fund', 'liability', 'credit'),
    ('5000', 'Operations Expense', 'expense', 'debit'),
    ('5010', 'Rent Expense', 'expense', 'debit'),
    ('5020', 'Utilities Expense', 'expense', 'debit'),
    ('5030', 'Staff Expense', 'expense', 'debit'),
    ('5040', 'Technology Expense', 'expense', 'debit'),
    ('5050', 'Depreciation Expense', 'expense', 'debit'),
    ('6100', 'Platform Subscription Expense', 'expense', 'debit');
