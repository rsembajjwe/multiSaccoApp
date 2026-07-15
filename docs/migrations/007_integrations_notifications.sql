-- Phase 6 integrations and notifications schema draft for PostgreSQL.
-- This file is documentation until database tooling is added.

CREATE TABLE mobile_money_callbacks (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  member_id UUID NOT NULL REFERENCES members(id),
  purpose TEXT NOT NULL,
  amount NUMERIC(18, 2) NOT NULL,
  external_reference TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'posted',
  resource_type TEXT,
  resource_id UUID,
  received_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, external_reference),
  CHECK (amount > 0)
);

CREATE INDEX idx_mobile_money_callbacks_tenant_received ON mobile_money_callbacks (tenant_id, received_at DESC);
CREATE INDEX idx_mobile_money_callbacks_member ON mobile_money_callbacks (member_id, received_at DESC);

CREATE TABLE notification_templates (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  channel TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, channel, event_type)
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  member_id UUID NOT NULL REFERENCES members(id),
  channel TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread',
  resource_type TEXT,
  resource_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

CREATE INDEX idx_notifications_member_created ON notifications (member_id, created_at DESC);
CREATE INDEX idx_notifications_tenant_status ON notifications (tenant_id, status);

CREATE TABLE notification_deliveries (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  notification_id UUID NOT NULL REFERENCES notifications(id),
  member_id UUID NOT NULL REFERENCES members(id),
  channel TEXT NOT NULL,
  provider TEXT NOT NULL,
  recipient TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_deliveries_tenant_created ON notification_deliveries (tenant_id, created_at DESC);
CREATE INDEX idx_notification_deliveries_notification ON notification_deliveries (notification_id);
