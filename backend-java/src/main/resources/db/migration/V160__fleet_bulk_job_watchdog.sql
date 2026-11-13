alter table fleet_bulk_jobs add column heartbeat_at timestamp with time zone;
alter table fleet_bulk_jobs add column recovery_count integer not null default 0;
alter table fleet_bulk_jobs add column last_recovered_at timestamp with time zone;

update fleet_bulk_jobs
set heartbeat_at = coalesce(finished_at, started_at, created_at)
where heartbeat_at is null;

create index idx_fleet_bulk_jobs_watchdog
    on fleet_bulk_jobs (status, heartbeat_at);
