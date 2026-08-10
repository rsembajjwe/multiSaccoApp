CREATE TABLE integration_job_runs (
    id VARCHAR(80) PRIMARY KEY,
    job_name VARCHAR(120) NOT NULL,
    status VARCHAR(40) NOT NULL,
    scanned_count INTEGER NOT NULL DEFAULT 0,
    updated_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    message VARCHAR(500),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    finished_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_integration_job_runs_name_finished ON integration_job_runs (job_name, finished_at DESC);
