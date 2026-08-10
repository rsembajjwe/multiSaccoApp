package com.methaltech.sacco.chat;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.branch.Branch;
import com.methaltech.sacco.branch.BranchRepository;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Staff and Platform Super Admin chat endpoints. Reuses the existing {@code complaints:view} /
 * {@code complaints:manage} permissions (chat replaces the complaint desk). SACCO staff are
 * tenant-scoped; the Platform Super Admin has full access across tenants.
 */
@RestController
@RequestMapping("/api/v1/chat")
class ChatController {

    private static final Set<String> THREAD_TYPES = Set.of(
            ChatThread.TYPE_MEMBER_SUPPORT,
            ChatThread.TYPE_PLATFORM_SUPPORT);

    private final ChatService chatService;
    private final MemberRepository memberRepository;
    private final BranchRepository branchRepository;
    private final AuthService authService;
    private final AuditService auditService;

    ChatController(
            ChatService chatService,
            MemberRepository memberRepository,
            BranchRepository branchRepository,
            AuthService authService,
            AuditService auditService) {
        this.chatService = chatService;
        this.memberRepository = memberRepository;
        this.branchRepository = branchRepository;
        this.authService = authService;
        this.auditService = auditService;
    }

    @GetMapping("/threads")
    ResponseEntity<?> listThreads(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "type", required = false) String type,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!authService.hasPermission(session.user(), "complaints:view")) {
            return authService.permissionRequired("complaints:view");
        }
        if (type != null && !type.isBlank() && !THREAD_TYPES.contains(type.trim())) {
            return invalidThreadType();
        }

        boolean platform = authService.isPlatform(session.user());
        boolean allTenants = platform && (requestedTenantId == null || requestedTenantId.isBlank());
        String tenantId = null;
        if (!allTenants) {
            tenantId = tenantScope(session, requestedTenantId);
            if (tenantId == null) return tenantAccessDenied();
        }

        String viewerRole = viewerRole(session);
        List<ChatThreadResponse> threads = chatService
                .listThreads(tenantId, type == null ? null : type.trim(), allTenants).stream()
                .filter(thread -> canAccessThread(session, thread))
                .map(thread -> chatService.toThreadResponse(thread, viewerRole))
                .toList();
        return ResponseEntity.ok(ApiResponse.of(threads));
    }

    @GetMapping("/threads/{threadId}/messages")
    ResponseEntity<?> listMessages(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String threadId) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!authService.hasPermission(session.user(), "complaints:view")) {
            return authService.permissionRequired("complaints:view");
        }

        return chatService.findThread(threadId)
                .<ResponseEntity<?>>map(thread -> {
                    if (!canAccessThread(session, thread)) return chatAccessDenied(session, thread);
                    return ResponseEntity.ok(ApiResponse.of(chatService.messages(threadId)));
                })
                .orElseGet(this::threadNotFound);
    }

    @PostMapping("/threads/{threadId}/messages")
    ResponseEntity<?> sendMessage(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String threadId,
            @Valid @RequestBody SendMessageRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!authService.hasPermission(session.user(), "complaints:manage")) {
            return authService.permissionRequired("complaints:manage");
        }

        return chatService.findThread(threadId)
                .<ResponseEntity<?>>map(thread -> {
                    if (!canAccessThread(session, thread)) return chatAccessDenied(session, thread);
                    ChatMessage message = chatService.addMessage(
                            thread,
                            senderType(session),
                            session.user().getId(),
                            body.body().trim());
                    auditService.record(
                            thread.getTenantId(),
                            session.user(),
                            "Replied on chat thread " + thread.getSubject(),
                            "chat_thread",
                            thread.getId(),
                            request.getRemoteAddr());
                    return ResponseEntity.status(HttpStatus.CREATED)
                            .body(ApiResponse.of(chatService.toMessageResponse(message)));
                })
                .orElseGet(this::threadNotFound);
    }

    @PostMapping("/threads")
    ResponseEntity<?> createThread(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody CreateThreadRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!authService.hasPermission(session.user(), "complaints:manage")) {
            return authService.permissionRequired("complaints:manage");
        }

        String type = body.type() == null ? "" : body.type().trim();
        if (!THREAD_TYPES.contains(type)) return invalidThreadType();

        boolean platform = authService.isPlatform(session.user());
        if (platform && (body.tenantId() == null || body.tenantId().isBlank())) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "TENANT_REQUIRED", "A tenant must be specified for platform chat threads."));
        }
        String tenantId = tenantScope(session, body.tenantId());
        if (tenantId == null) return tenantAccessDenied();

        String memberId = null;
        if (ChatThread.TYPE_MEMBER_SUPPORT.equals(type)) {
            if (body.memberId() == null || body.memberId().isBlank()) {
                return ResponseEntity.badRequest()
                        .body(ApiErrorResponse.of(400, "MEMBER_REQUIRED", "A member is required for a member support thread."));
            }
            memberId = body.memberId().trim();
            String scopedTenant = tenantId;
            boolean memberAllowed = memberRepository.findById(memberId)
                    .filter(member -> member.getTenantId().equals(scopedTenant))
                    .isPresent();
            if (!memberAllowed) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "MEMBER_NOT_FOUND", "Chat member not found for this SACCO."));
            }
            Member member = memberRepository.findById(memberId).orElse(null);
            if (member != null && !canAccessMemberBranch(session, tenantId, member)) {
                return branchAccessDenied();
            }
        }

        ChatThread thread = chatService.createThread(
                tenantId,
                type,
                memberId,
                body.subject().trim(),
                session.user().getId(),
                null);
        if (body.message() != null && !body.message().isBlank()) {
            chatService.addMessage(thread, senderType(session), session.user().getId(), body.message().trim());
        }
        auditService.record(
                tenantId,
                session.user(),
                "Opened chat thread " + thread.getSubject(),
                "chat_thread",
                thread.getId(),
                request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of(chatService.toThreadResponse(thread, viewerRole(session))));
    }

    @PostMapping("/threads/{threadId}/read")
    ResponseEntity<?> markRead(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String threadId) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!authService.hasPermission(session.user(), "complaints:view")) {
            return authService.permissionRequired("complaints:view");
        }

        return chatService.findThread(threadId)
                .<ResponseEntity<?>>map(thread -> {
                    if (!canAccessThread(session, thread)) return chatAccessDenied(session, thread);
                    chatService.markRead(thread, viewerRole(session), Instant.now());
                    return ResponseEntity.ok(ApiResponse.of(chatService.toThreadResponse(thread, viewerRole(session))));
                })
                .orElseGet(this::threadNotFound);
    }

    private String viewerRole(AuthService.CurrentSession session) {
        return authService.isPlatform(session.user()) ? ChatMessage.SENDER_PLATFORM : ChatMessage.SENDER_STAFF;
    }

    private String senderType(AuthService.CurrentSession session) {
        return authService.isPlatform(session.user()) ? ChatMessage.SENDER_PLATFORM : ChatMessage.SENDER_STAFF;
    }

    private String tenantScope(AuthService.CurrentSession session, String requestedTenantId) {
        String tenantId = requestedTenantId == null || requestedTenantId.isBlank()
                ? session.user().getTenantId()
                : requestedTenantId.trim();
        if (!canAccess(session, tenantId)) return null;
        return tenantId;
    }

    private boolean canAccess(AuthService.CurrentSession session, String tenantId) {
        return authService.isPlatform(session.user()) || tenantId.equals(session.user().getTenantId());
    }

    private boolean canAccessThread(AuthService.CurrentSession session, ChatThread thread) {
        if (!canAccess(session, thread.getTenantId())) return false;
        if (!ChatThread.TYPE_MEMBER_SUPPORT.equals(thread.getType())) return true;
        if (thread.getMemberId() == null || thread.getMemberId().isBlank()) return true;
        Member member = memberRepository.findById(thread.getMemberId()).orElse(null);
        return member != null && canAccessMemberBranch(session, thread.getTenantId(), member);
    }

    private boolean canAccessMemberBranch(AuthService.CurrentSession session, String tenantId, Member member) {
        List<String> scopedBranchIds = branchScope(session, tenantId);
        return scopedBranchIds.isEmpty() || scopedBranchIds.contains(member.getBranchId());
    }

    private List<String> branchScope(AuthService.CurrentSession session, String tenantId) {
        if (authService.isPlatform(session.user()) || authService.hasPermission(session.user(), "tenants:manage")) {
            return List.of();
        }
        return branchRepository.findByTenantIdAndManagerUserIdOrderByCodeAsc(tenantId, session.user().getId()).stream()
                .map(Branch::getId)
                .toList();
    }

    private ResponseEntity<ApiErrorResponse> chatAccessDenied(AuthService.CurrentSession session, ChatThread thread) {
        return canAccess(session, thread.getTenantId()) ? branchAccessDenied() : tenantAccessDenied();
    }

    private ResponseEntity<?> threadNotFound() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiErrorResponse.of(404, "CHAT_THREAD_NOT_FOUND", "Chat thread not found."));
    }

    private ResponseEntity<ApiErrorResponse> invalidThreadType() {
        return ResponseEntity.badRequest()
                .body(ApiErrorResponse.of(400, "INVALID_THREAD_TYPE", "Thread type must be MEMBER_SUPPORT or PLATFORM_SUPPORT."));
    }

    private ResponseEntity<ApiErrorResponse> tenantAccessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access chat for another tenant."));
    }

    private ResponseEntity<ApiErrorResponse> branchAccessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "BRANCH_ACCESS_DENIED", "Cannot access member support chat outside assigned branch scope."));
    }

    record SendMessageRequest(@NotBlank @Size(max = 4000) String body) {
    }

    record CreateThreadRequest(
            String tenantId,
            @NotBlank String type,
            String memberId,
            @NotBlank @Size(max = 180) String subject,
            @Size(max = 4000) String message) {
    }
}
