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
  approved_by_user_id UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  disbursed_by_user_id UUID REFERENCES users(id),
  disbursed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loans_tenant_status ON loans (tenant_id, status);
CREATE INDEX idx_loans_tenant_member ON loans (tenant_id, member_id);

CREATE TABLE loan_repayments (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  loan_id UUID NOT NULL REFERENCES loans(id),
  member_id UUID NOT NULL REFERENCES members(id),
  amount NUMERIC(18, 2) NOT NULL,
  channel TEXT NOT NULL,
  external_reference TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, external_reference)
);

CREATE INDEX idx_loan_repayments_loan_received ON loan_repayments (loan_id, received_at);
CREATE INDEX idx_loan_repayments_member_received ON loan_repayments (member_id, received_at);

CREATE TABLE loan_guarantors (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  loan_id UUID NOT NULL REFERENCES loans(id),
  member_id UUID NOT NULL REFERENCES members(id),
  guaranteed_amount NUMERIC(18, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_by_user_id UUID NOT NULL REFERENCES users(id),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (loan_id, member_id)
);

CREATE INDEX idx_loan_guarantors_member_status ON loan_guarantors (member_id, status);
CREATE INDEX idx_loan_guarantors_loan_status ON loan_guarantors (loan_id, status);
