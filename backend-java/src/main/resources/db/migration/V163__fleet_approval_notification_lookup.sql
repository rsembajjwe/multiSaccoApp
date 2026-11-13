alter table notifications add column deduplication_key varchar(300);

create unique index uq_notifications_deduplication_key
    on notifications (deduplication_key);
