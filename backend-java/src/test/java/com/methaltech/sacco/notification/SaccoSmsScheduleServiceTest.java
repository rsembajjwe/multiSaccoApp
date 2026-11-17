package com.methaltech.sacco.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.methaltech.sacco.member.Member;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class SaccoSmsScheduleServiceTest {

    private final SaccoSmsScheduleRepository repository = mock(SaccoSmsScheduleRepository.class);
    private final SaccoSmsBroadcastService broadcastService = mock(SaccoSmsBroadcastService.class);
    private final SaccoSmsScheduleService service = new SaccoSmsScheduleService(repository, broadcastService);

    @Test
    void schedulesMessagesWithPreviewedCreditsAndListsThem() {
        Member member = mock(Member.class);
        when(broadcastService.preview("tenant_one", List.of("member_one"), "custom", "Hello"))
                .thenReturn(new SaccoSmsBroadcastService.Preview(List.of(member), Map.of("member_one", "Hello"), 2, 5));
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        SaccoSmsSchedule schedule = service.schedule("tenant_one", "Notice", "Hello", "custom",
                List.of("member_one"), Instant.now().plusSeconds(60), "user_one");

        assertTrue(schedule.getId().startsWith("sms_schedule_"));
        assertEquals("tenant_one", schedule.getTenantId());
        assertEquals("Notice", schedule.getTitle());
        assertEquals("Hello", schedule.getBody());
        assertEquals("custom", schedule.getMessageMode());
        assertEquals(List.of("member_one"), schedule.selectedMemberIds());
        assertEquals("scheduled", schedule.getStatus());
        assertEquals(2, schedule.getEstimatedCredits());
        assertEquals("user_one", schedule.getCreatedBy());

        when(repository.findByTenantIdOrderByCreatedAtDesc("tenant_one")).thenReturn(List.of(schedule));
        assertEquals(List.of(schedule), service.list("tenant_one"));
    }

    @Test
    void rejectsEmptyRecipientsAndInsufficientCredits() {
        when(broadcastService.preview("tenant_one", List.of(), "custom", "Hello"))
                .thenReturn(new SaccoSmsBroadcastService.Preview(List.of(), Map.of(), 0, 5));
        assertThrows(IllegalArgumentException.class, () -> service.schedule(
                "tenant_one", "Notice", "Hello", "custom", List.of(), Instant.now(), "user_one"));

        Member member = mock(Member.class);
        when(broadcastService.preview("tenant_one", List.of(), "custom", "Expensive"))
                .thenReturn(new SaccoSmsBroadcastService.Preview(List.of(member), Map.of(), 4, 3));
        assertThrows(IllegalStateException.class, () -> service.schedule(
                "tenant_one", "Notice", "Expensive", "custom", List.of(), Instant.now(), "user_one"));
    }

    @Test
    void cancellationRequiresTenantOwnershipAndPendingStatus() {
        SaccoSmsSchedule schedule = schedule("cancel_me");
        when(repository.findById("missing")).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class, () -> service.cancel("tenant_one", "missing"));

        when(repository.findById("cancel_me")).thenReturn(Optional.of(schedule));
        assertThrows(IllegalArgumentException.class, () -> service.cancel("tenant_two", "cancel_me"));
        when(repository.save(schedule)).thenReturn(schedule);
        assertEquals("cancelled", service.cancel("tenant_one", "cancel_me").getStatus());
        assertThrows(IllegalStateException.class, () -> service.cancel("tenant_one", "cancel_me"));
    }

    @Test
    void dueMessagesAreClaimedThenMarkedSentOrFailed() {
        SaccoSmsSchedule sent = schedule("send_me");
        SaccoSmsSchedule failed = schedule("fail_me");
        SaccoSmsSchedule skipped = schedule("skip_me");
        when(repository.findTop100ByStatusAndScheduledAtLessThanEqualOrderByScheduledAtAsc(
                org.mockito.ArgumentMatchers.eq("scheduled"), any()))
                .thenReturn(List.of(sent, failed, skipped));
        when(repository.claim(org.mockito.ArgumentMatchers.eq("send_me"), any())).thenReturn(1);
        when(repository.claim(org.mockito.ArgumentMatchers.eq("fail_me"), any())).thenReturn(1);
        when(repository.claim(org.mockito.ArgumentMatchers.eq("skip_me"), any())).thenReturn(0);
        when(broadcastService.send("tenant_one", List.of("member_one"), "custom", "Notice", "Hello"))
                .thenReturn(new SaccoSmsBroadcastService.SendResult(1, 2, 7))
                .thenThrow(new RuntimeException());

        service.sendDue();

        assertEquals("sent", sent.getStatus());
        assertEquals(1, sent.getRecipients());
        assertEquals(2, sent.getCreditsUsed());
        assertTrue(sent.getSentAt() != null);
        assertEquals("failed", failed.getStatus());
        assertEquals("SMS scheduling failed.", failed.getFailureReason());
        assertEquals("scheduled", skipped.getStatus());
        verify(repository).save(sent);
        verify(repository).save(failed);
    }

    @Test
    void entityNormalizesSelectionsAndTruncatesFailureDetails() {
        SaccoSmsSchedule schedule = new SaccoSmsSchedule("entity", "tenant_one", "Notice", "Hello", "custom",
                List.of("", "member_one"), Instant.now(), 1, "user_one");
        assertEquals(List.of("member_one"), schedule.selectedMemberIds());
        schedule.failed("x".repeat(600));
        assertEquals(500, schedule.getFailureReason().length());
        schedule.cancel();
        assertEquals("cancelled", schedule.getStatus());
    }

    private SaccoSmsSchedule schedule(String id) {
        return new SaccoSmsSchedule(id, "tenant_one", "Notice", "Hello", "custom",
                List.of("member_one"), Instant.now().minusSeconds(10), 2, "user_one");
    }
}
