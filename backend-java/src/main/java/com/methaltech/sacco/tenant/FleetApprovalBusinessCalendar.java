package com.methaltech.sacco.tenant;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
class FleetApprovalBusinessCalendar {
    private final ZoneId zone;
    private final LocalTime businessDayStart;
    private final LocalTime businessDayEnd;
    private final int slaHours;
    private final int warningRemainingHours;
    private final Set<LocalDate> holidays;

    FleetApprovalBusinessCalendar(
            @Value("${sacco.fleet.approval-sla.zone:Africa/Kampala}") String zone,
            @Value("${sacco.fleet.approval-sla.business-day-start:08:00}") String businessDayStart,
            @Value("${sacco.fleet.approval-sla.business-day-end:17:00}") String businessDayEnd,
            @Value("${sacco.fleet.approval-sla.hours:8}") int slaHours,
            @Value("${sacco.fleet.approval-sla.warning-remaining-hours:4}") int warningRemainingHours,
            @Value("${sacco.fleet.approval-sla.holidays:}") String holidays) {
        this.zone = ZoneId.of(zone.trim());
        this.businessDayStart = LocalTime.parse(businessDayStart.trim());
        this.businessDayEnd = LocalTime.parse(businessDayEnd.trim());
        this.slaHours = slaHours;
        this.warningRemainingHours = warningRemainingHours;
        this.holidays = parseHolidays(holidays);
        if (!this.businessDayEnd.isAfter(this.businessDayStart)) {
            throw new IllegalArgumentException("Fleet approval business-day end must be after its start.");
        }
        if (slaHours <= 0 || warningRemainingHours <= 0 || warningRemainingHours >= slaHours) {
            throw new IllegalArgumentException("Fleet approval SLA hours must exceed the warning remaining hours.");
        }
    }

    ApprovalDeadlines deadlinesFrom(Instant submittedAt) {
        if (submittedAt == null) throw new IllegalArgumentException("Approval submission time is required.");
        return new ApprovalDeadlines(
                addBusinessHours(submittedAt, slaHours - warningRemainingHours),
                addBusinessHours(submittedAt, slaHours));
    }

    private Instant addBusinessHours(Instant start, int hours) {
        Duration remaining = Duration.ofHours(hours);
        ZonedDateTime cursor = start.atZone(zone);
        while (!remaining.isZero()) {
            if (!isBusinessDay(cursor.toLocalDate())) {
                cursor = nextBusinessDayStart(cursor.toLocalDate().plusDays(1));
                continue;
            }
            ZonedDateTime opening = cursor.toLocalDate().atTime(businessDayStart).atZone(zone);
            ZonedDateTime closing = cursor.toLocalDate().atTime(businessDayEnd).atZone(zone);
            if (cursor.isBefore(opening)) cursor = opening;
            if (!cursor.isBefore(closing)) {
                cursor = nextBusinessDayStart(cursor.toLocalDate().plusDays(1));
                continue;
            }
            Duration available = Duration.between(cursor, closing);
            if (remaining.compareTo(available) <= 0) return cursor.plus(remaining).toInstant();
            remaining = remaining.minus(available);
            cursor = nextBusinessDayStart(cursor.toLocalDate().plusDays(1));
        }
        return cursor.toInstant();
    }

    private ZonedDateTime nextBusinessDayStart(LocalDate date) {
        LocalDate candidate = date;
        while (!isBusinessDay(candidate)) candidate = candidate.plusDays(1);
        return candidate.atTime(businessDayStart).atZone(zone);
    }

    private boolean isBusinessDay(LocalDate date) {
        DayOfWeek day = date.getDayOfWeek();
        return day != DayOfWeek.SATURDAY && day != DayOfWeek.SUNDAY && !holidays.contains(date);
    }

    private Set<LocalDate> parseHolidays(String configuredHolidays) {
        if (configuredHolidays == null || configuredHolidays.isBlank()) return Set.of();
        return Arrays.stream(configuredHolidays.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .map(LocalDate::parse)
                .collect(Collectors.toUnmodifiableSet());
    }

    String zoneId() { return zone.getId(); }
    String businessHours() { return businessDayStart + "-" + businessDayEnd; }
    int slaHours() { return slaHours; }
    int warningRemainingHours() { return warningRemainingHours; }

    record ApprovalDeadlines(Instant dueSoonAt, Instant dueAt) {}
}
