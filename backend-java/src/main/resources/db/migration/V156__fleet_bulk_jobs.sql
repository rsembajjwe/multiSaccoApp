CREATE TABLE fleet_bulk_jobs (
    id VARCHAR(80) PRIMARY KEY,
    requested_by VARCHAR(80) NOT NULL,
    requested_by_name VARCHAR(160) NOT NULL,
    requested_count INTEGER NOT NULL,
    succeeded_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(40) NOT NULL,
    target_status VARCHAR(40),
    account_manager_user_id VARCHAR(80),
    account_manager_name VARCHAR(160),
    created_at TIMESTAMP NOT NULL,
    started_at TIMESTAMP,
    finished_at TIMESTAMP
);

CREATE TABLE fleet_bulk_job_results (
    id VARCHAR(80) PRIMARY KEY,
    job_id VARCHAR(80) NOT NULL,
    tenant_id VARCHAR(80) NOT NULL,
    tenant_name VARCHAR(220),
    status VARCHAR(40) NOT NULL,
    message VARCHAR(500),
    processed_at TIMESTAMP,
    CONSTRAINT fk_fleet_bulk_result_job FOREIGN KEY (job_id) REFERENCES fleet_bulk_jobs(id) ON DELETE CASCADE,
    CONSTRAINT uq_fleet_bulk_result_tenant UNIQUE (job_id, tenant_id)
);

CREATE INDEX idx_fleet_bulk_jobs_requester_created ON fleet_bulk_jobs (requested_by, created_at DESC);
CREATE INDEX idx_fleet_bulk_results_job_status ON fleet_bulk_job_results (job_id, status);
