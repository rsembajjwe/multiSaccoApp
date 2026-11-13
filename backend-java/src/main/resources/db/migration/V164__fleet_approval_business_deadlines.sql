alter table fleet_bulk_jobs add column approval_due_soon_at timestamp with time zone;
alter table fleet_bulk_jobs add column approval_due_at timestamp with time zone;

create index idx_fleet_bulk_jobs_approval_due
    on fleet_bulk_jobs (status, approval_due_at);

create index idx_fleet_bulk_jobs_approval_warning
    on fleet_bulk_jobs (status, approval_due_soon_at);
