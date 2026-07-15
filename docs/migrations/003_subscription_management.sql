-- Subscription management schema draft for PostgreSQL.
-- This file is documentation until database tooling is added.

CREATE TABLE subscription_packages (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(18, 2) NOT NULL DEFAULT 5000,
  billing_period TEXT NOT NULL,
  min_members INTEGER NOT NULL DEFAULT 100,
  member_limit INTEGER,
  user_limit INTEGER,
  branch_limit INTEGER,
  modules TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  package_id UUID NOT NULL REFERENCES subscription_packages(id),
  status TEXT NOT NULL,
  invoice TEXT NOT NULL,
  member_count INTEGER NOT NULL DEFAULT 0,
  billable_members INTEGER NOT NULL DEFAULT 100,
  unit_price NUMERIC(18, 2) NOT NULL DEFAULT 5000,
  amount NUMERIC(18, 2) NOT NULL,
  paid NUMERIC(18, 2) NOT NULL DEFAULT 0,
  expiry DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (invoice)
);

CREATE INDEX idx_subscriptions_tenant_status ON subscriptions (tenant_id, status);

CREATE TABLE subscription_payments (
  id UUID PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  amount NUMERIC(18, 2) NOT NULL,
  channel TEXT NOT NULL,
  external_reference TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by UUID REFERENCES users(id),
  UNIQUE (external_reference)
);

CREATE INDEX idx_subscription_payments_tenant ON subscription_payments (tenant_id, received_at DESC);
