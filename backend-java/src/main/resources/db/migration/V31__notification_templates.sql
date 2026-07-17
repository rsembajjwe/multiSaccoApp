CREATE TABLE notification_templates (
    id VARCHAR(80) PRIMARY KEY,
    tenant_id VARCHAR(80),
    channel VARCHAR(32) NOT NULL,
    event_type VARCHAR(80) NOT NULL,
    title VARCHAR(160) NOT NULL,
    body VARCHAR(500) NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_templates_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_notification_templates_tenant_event ON notification_templates (tenant_id, event_type, channel);

INSERT INTO notification_templates (id, tenant_id, channel, event_type, title, body, status, created_at, updated_at) VALUES
    ('template_payment_received', NULL, 'in_app', 'payment_received', 'Payment received', 'Your SACCO payment has been received and posted.', 'active', TIMESTAMP WITH TIME ZONE '2026-07-14 09:00:00+00', TIMESTAMP WITH TIME ZONE '2026-07-14 09:00:00+00'),
    ('template_loan_repayment_received', NULL, 'in_app', 'loan_repayment_received', 'Loan repayment received', 'Your loan repayment has been received and posted.', 'active', TIMESTAMP WITH TIME ZONE '2026-07-14 09:00:00+00', TIMESTAMP WITH TIME ZONE '2026-07-14 09:00:00+00'),
    ('template_loan_application_submitted', NULL, 'in_app', 'loan_application_submitted', 'Loan application submitted', 'Your mobile loan application has been submitted for review.', 'active', TIMESTAMP WITH TIME ZONE '2026-07-14 09:00:00+00', TIMESTAMP WITH TIME ZONE '2026-07-14 09:00:00+00'),
    ('template_complaint_synced', NULL, 'in_app', 'complaint_synced', 'Complaint synced', 'Your offline complaint draft has been synced to the SACCO.', 'active', TIMESTAMP WITH TIME ZONE '2026-07-14 09:00:00+00', TIMESTAMP WITH TIME ZONE '2026-07-14 09:00:00+00');
