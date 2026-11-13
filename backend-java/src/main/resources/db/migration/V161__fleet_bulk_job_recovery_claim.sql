alter table fleet_bulk_jobs add column last_recovered_by varchar(160);

create index idx_fleet_bulk_jobs_recovery_claim
    on fleet_bulk_jobs (status, heartbeat_at, id);
