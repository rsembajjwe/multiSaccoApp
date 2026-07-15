-- Loan application schema draft for PostgreSQL.
-- This file is documentation until database tooling is added.

CREATE TABLE loans (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  member_id UUID NOT NULL REFERENCES members(id),
  product TEXT NOT NULL,
  amount NUMERIC(18, 2) NOT NULL,
  balance NUMERIC(18, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'submitted',
  stage TEXT NOT NULL DEFAULT 'Credit Appraisal',
  guarantors INTEGER NOT NULL DEFAULT 0,
  dsr INTEGER NOT NULL DEFAULT 0,
  repayment_months INTEGER NOT NULL,
  purpose TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loans_tenant_status ON loans (tenant_id, status);
CREATE INDEX idx_loans_tenant_member ON loans (tenant_id, member_id);
