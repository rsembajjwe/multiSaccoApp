-- Governance schema draft for PostgreSQL.
-- This file is documentation until database tooling is added.

CREATE TABLE governance_meetings (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  title TEXT NOT NULL,
  meeting_type TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  chair_user_id UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'scheduled',
  minutes TEXT,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE governance_resolutions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  meeting_id UUID NOT NULL REFERENCES governance_meetings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  decision TEXT,
  owner_user_id UUID REFERENCES users(id),
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'open',
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE complaints (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  member_id UUID REFERENCES members(id),
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_user_id UUID REFERENCES users(id),
  resolution TEXT,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  resolved_by_user_id UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_governance_meetings_tenant_date ON governance_meetings (tenant_id, scheduled_at);
CREATE INDEX idx_governance_resolutions_tenant_status ON governance_resolutions (tenant_id, status);
CREATE INDEX idx_complaints_tenant_status ON complaints (tenant_id, status);
CREATE INDEX idx_complaints_member_status ON complaints (member_id, status);
