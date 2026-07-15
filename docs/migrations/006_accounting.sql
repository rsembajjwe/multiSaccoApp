-- Accounting schema draft for PostgreSQL.
-- This file is documentation until database tooling is added.

CREATE TABLE chart_of_accounts (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  normal_balance TEXT NOT NULL
);

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
