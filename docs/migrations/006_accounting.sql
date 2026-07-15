-- Accounting schema draft for PostgreSQL.
-- This file is documentation until database tooling is added.

CREATE TABLE chart_of_accounts (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  normal_balance TEXT NOT NULL
);

CREATE TABLE accounting_periods (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  period TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  closed_by_user_id UUID REFERENCES users(id),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, period)
);

CREATE INDEX idx_accounting_periods_tenant_status ON accounting_periods (tenant_id, status);

CREATE TABLE journal_entries (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  reference TEXT NOT NULL,
  description TEXT,
  posted_at TIMESTAMPTZ NOT NULL,
  debit_total NUMERIC(18, 2) NOT NULL,
  credit_total NUMERIC(18, 2) NOT NULL,
  is_balanced BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id)
);

CREATE TABLE journal_lines (
  id UUID PRIMARY KEY,
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL REFERENCES chart_of_accounts(code),
  member_id UUID REFERENCES members(id),
  debit NUMERIC(18, 2) NOT NULL DEFAULT 0,
  credit NUMERIC(18, 2) NOT NULL DEFAULT 0,
  CHECK (debit >= 0),
  CHECK (credit >= 0),
  CHECK (debit > 0 OR credit > 0)
);

CREATE INDEX idx_journal_entries_tenant_posted ON journal_entries (tenant_id, posted_at);
CREATE INDEX idx_journal_entries_source ON journal_entries (source_type, source_id);
CREATE INDEX idx_journal_lines_account ON journal_lines (account_code);

CREATE TABLE statement_lines (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  account_code TEXT NOT NULL REFERENCES chart_of_accounts(code),
  channel TEXT NOT NULL,
  amount NUMERIC(18, 2) NOT NULL,
  external_reference TEXT NOT NULL,
  description TEXT,
  statement_date DATE NOT NULL,
  imported_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, external_reference),
  CHECK (amount <> 0)
);

CREATE INDEX idx_statement_lines_tenant_date ON statement_lines (tenant_id, statement_date);
CREATE INDEX idx_statement_lines_match ON statement_lines (tenant_id, account_code, external_reference, amount);
