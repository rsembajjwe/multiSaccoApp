-- Phase 2 onboarding and membership schema draft for PostgreSQL.
-- This file is documentation until database tooling is added.

CREATE TABLE branches (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  manager_user_id UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);

CREATE TABLE members (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  membership_no TEXT NOT NULL,
  full_name TEXT NOT NULL,
  member_type TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  national_id TEXT,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_approval',
  kyc_status TEXT NOT NULL DEFAULT 'pending_verification',
  joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, membership_no)
);

CREATE INDEX idx_members_tenant_status ON members (tenant_id, status);
CREATE INDEX idx_members_tenant_branch ON members (tenant_id, branch_id);

CREATE TABLE member_sessions (
  id UUID PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_member_sessions_member ON member_sessions (member_id, expires_at);

CREATE TABLE member_documents (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  member_id UUID NOT NULL REFERENCES members(id),
  document_type TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending_verification',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_member_documents_tenant_member ON member_documents (tenant_id, member_id);
