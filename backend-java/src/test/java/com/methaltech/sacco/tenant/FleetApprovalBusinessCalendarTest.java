package com.methaltech.sacco.tenant;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class FleetApprovalBusinessCalendarTest {

    @Test
    void carriesFridayAfternoonSlaIntoMondayBusinessHours() {
        FleetApprovalBusinessCalendar calendar = calendar("");

        FleetApprovalBusinessCalendar.ApprovalDeadlines deadlines =
                calendar.deadlinesFrom(Instant.parse("2026-10-02T13:00:00Z")); // Friday 16:00 Kampala

        assertEquals(Instant.parse("2026-10-05T08:00:00Z"), deadlines.dueSoonAt()); // Monday 11:00
        assertEquals(Instant.parse("2026-10-05T12:00:00Z"), deadlines.dueAt()); // Monday 15:00
    }

    @Test
    void skipsConfiguredPublicHolidays() {
        FleetApprovalBusinessCalendar calendar = calendar("2026-10-09");

        FleetApprovalBusinessCalendar.ApprovalDeadlines deadlines =
                calendar.deadlinesFrom(Instant.parse("2026-10-08T12:00:00Z")); // Thursday 15:00 Kampala

        assertEquals(Instant.parse("2026-10-12T07:00:00Z"), deadlines.dueSoonAt()); // Monday 10:00
        assertEquals(Instant.parse("2026-10-12T11:00:00Z"), deadlines.dueAt()); // Monday 14:00
    }

    @Test
    void startsTheClockAtOpeningForAfterHoursSubmissions() {
        FleetApprovalBusinessCalendar calendar = calendar("");

        FleetApprovalBusinessCalendar.ApprovalDeadlines deadlines =
                calendar.deadlinesFrom(Instant.parse("2026-09-30T18:00:00Z")); // Wednesday 21:00 Kampala

        assertEquals(Instant.parse("2026-10-01T09:00:00Z"), deadlines.dueSoonAt()); // Thursday 12:00
        assertEquals(Instant.parse("2026-10-01T13:00:00Z"), deadlines.dueAt()); // Thursday 16:00
    }

    private FleetApprovalBusinessCalendar calendar(String holidays) {
        return new FleetApprovalBusinessCalendar("Africa/Kampala", "08:00", "17:00", 8, 4, holidays);
    }
}
