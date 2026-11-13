alter table fleet_bulk_jobs add column request_reason varchar(500);
alter table fleet_bulk_jobs add column decided_by varchar(80);
alter table fleet_bulk_jobs add column decided_by_name varchar(160);
alter table fleet_bulk_jobs add column decision_reason varchar(500);
alter table fleet_bulk_jobs add column decided_at timestamp with time zone;
alter table fleet_bulk_jobs add column version bigint not null default 0;

update fleet_bulk_jobs
set request_reason = 'Created before maker-checker approval was introduced'
where request_reason is null;

alter table fleet_bulk_jobs alter column request_reason set not null;
create index idx_fleet_bulk_jobs_approval_queue on fleet_bulk_jobs (status, created_at desc);
