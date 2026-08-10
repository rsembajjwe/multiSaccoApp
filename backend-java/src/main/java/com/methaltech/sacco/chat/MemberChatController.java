package com.methaltech.sacco.chat;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Member-facing chat, scoped to the authenticated member's own {@code MEMBER_SUPPORT} threads.
 * Members can never see {@code PLATFORM_SUPPORT} threads or other members' conversations; non-owned
 * threads return 404 so their existence is not revealed.
 */
@RestController
@RequestMapping("/api/v1/member-auth/chat")
class MemberChatController {

    private final ChatService chatService;
    private final MemberAuthService memberAuthService;
    private final AuditService auditService;

    MemberChatController(
            ChatService chatService,
            MemberAuthService memberAuthService,
            AuditService auditService) {
        this.chatService = chatService;
        this.memberAuthService = memberAuthService;
        this.auditService = auditService;
    }

    @GetMapping("/threads")
    ResponseEntity<?> listThreads(@RequestHeader(name = "Authorization", required = false) String authorization) {
        MemberAuthService.CurrentMemberSession session = memberAuthService.currentSession(authorization);
        if (session == null) return memberAuthService.authRequired();

        List<ChatThreadResponse> threads = chatService.listMemberThreads(session.member().getId()).stream()
                .map(thread -> chatService.toThreadResponse(thread, ChatMessage.SENDER_MEMBER))
                .toList();
        return ResponseEntity.ok(ApiResponse.of(threads));
    }

    @GetMapping("/threads/{threadId}/messages")
    ResponseEntity<?> listMessages(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String threadId) {
        MemberAuthService.CurrentMemberSession session = memberAuthService.currentSession(authorization);
        if (session == null) return memberAuthService.authRequired();

        return chatService.findThread(threadId)
                .filter(thread -> ownsThread(session.member(), thread))
                .<ResponseEntity<?>>map(thread -> ResponseEntity.ok(ApiResponse.of(chatService.messages(threadId))))
                .orElseGet(this::threadNotFound);
    }

    @PostMapping("/threads/{threadId}/messages")
    ResponseEntity<?> sendMessage(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String threadId,
            @Valid @RequestBody MemberMessageRequest body,
            HttpServletRequest request) {
        MemberAuthService.CurrentMemberSession session = memberAuthService.currentSession(authorization);
        if (session == null) return memberAuthService.authRequired();

        return chatService.findThread(threadId)
                .filter(thread -> ownsThread(session.member(), thread))
                .<ResponseEntity<?>>map(thread -> {
                    ChatMessage message = chatService.addMessage(
                            thread,
                            ChatMessage.SENDER_MEMBER,
                            session.member().getId(),
                            body.body().trim());
                    recordAudit(session.member(), thread, "Replied on support chat", request);
                    return ResponseEntity.status(HttpStatus.CREATED)
                            .body(ApiResponse.of(chatService.toMessageResponse(message)));
                })
                .orElseGet(this::threadNotFound);
    }

    @PostMapping("/threads")
    ResponseEntity<?> createThread(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody MemberCreateThreadRequest body,
            HttpServletRequest request) {
        MemberAuthService.CurrentMemberSession session = memberAuthService.currentSession(authorization);
        if (session == null) return memberAuthService.authRequired();

        Member member = session.member();
        ChatThread thread = chatService.createThread(
                member.getTenantId(),
                ChatThread.TYPE_MEMBER_SUPPORT,
                member.getId(),
                body.subject().trim(),
                null,
                member.getId());
        chatService.addMessage(thread, ChatMessage.SENDER_MEMBER, member.getId(), body.message().trim());
        recordAudit(member, thread, "Opened support chat", request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of(chatService.toThreadResponse(thread, ChatMessage.SENDER_MEMBER)));
    }

    @PostMapping("/threads/{threadId}/read")
    ResponseEntity<?> markRead(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String threadId) {
        MemberAuthService.CurrentMemberSession session = memberAuthService.currentSession(authorization);
        if (session == null) return memberAuthService.authRequired();

        return chatService.findThread(threadId)
                .filter(thread -> ownsThread(session.member(), thread))
                .<ResponseEntity<?>>map(thread -> {
                    chatService.markRead(thread, ChatMessage.SENDER_MEMBER, Instant.now());
                    return ResponseEntity.ok(ApiResponse.of(chatService.toThreadResponse(thread, ChatMessage.SENDER_MEMBER)));
                })
                .orElseGet(this::threadNotFound);
    }

    private boolean ownsThread(Member member, ChatThread thread) {
        return ChatThread.TYPE_MEMBER_SUPPORT.equals(thread.getType())
                && member.getId().equals(thread.getMemberId())
                && member.getTenantId().equals(thread.getTenantId());
    }

    private void recordAudit(Member member, ChatThread thread, String action, HttpServletRequest request) {
        auditService.record(
                member.getTenantId(),
                member.getId(),
                member.getFullName(),
                action + " " + thread.getSubject(),
                "chat_thread",
                thread.getId(),
                request.getRemoteAddr());
    }

    private ResponseEntity<?> threadNotFound() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiErrorResponse.of(404, "CHAT_THREAD_NOT_FOUND", "Chat thread not found."));
    }

    record MemberMessageRequest(@NotBlank @Size(max = 4000) String body) {
    }

    record MemberCreateThreadRequest(
            @NotBlank @Size(max = 180) String subject,
            @NotBlank @Size(max = 4000) String message) {
    }
}
