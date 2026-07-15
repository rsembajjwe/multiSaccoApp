-- Core financial transaction schema draft for PostgreSQL.
-- This file is documentation until database tooling is added.

CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  member_id UUID NOT NULL REFERENCES members(id),
  type TEXT NOT NULL,
  channel TEXT NOT NULL,
  amount NUMERIC(18, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_approval',
  reference TEXT NOT NULL,
  narration TEXT,
  maker_user_id UUID NOT NULL REFERENCES users(id),
  checker_user_id UUID REFERENCES users(id),
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, reference)
);

CREATE INDEX idx_financial_transactions_tenant_status ON financial_transactions (tenant_id, status);
CREATE INDEX idx_financial_transactions_tenant_member ON financial_transactions (tenant_id, member_id);
CREATE INDEX idx_financial_transactions_tenant_branch ON financial_transactions (tenant_id, branch_id);
