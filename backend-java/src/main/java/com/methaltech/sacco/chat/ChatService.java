package com.methaltech.sacco.chat;

import com.methaltech.sacco.identity.UserDirectoryService;
import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberRepository;
import com.methaltech.sacco.notification.NotificationService;
import com.methaltech.sacco.tenant.TenantService;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Business logic for the support chat. Threads carry a {@code tenantId} for isolation; callers are
 * responsible for authorising access to a tenant before invoking these methods. Sending a message
 * also marks the sender's side as read so their own messages never count as unread to themselves.
 */
@Service
public class ChatService {

    private static final int PREVIEW_LENGTH = 140;

    private final ChatThreadRepository threadRepository;
    private final ChatMessageRepository messageRepository;
    private final MemberRepository memberRepository;
    private final UserDirectoryService userDirectory;
    private final TenantService tenantService;
    private final NotificationService notificationService;

    ChatService(
            ChatThreadRepository threadRepository,
            ChatMessageRepository messageRepository,
            MemberRepository memberRepository,
            UserDirectoryService userDirectory,
            TenantService tenantService,
            NotificationService notificationService) {
        this.threadRepository = threadRepository;
        this.messageRepository = messageRepository;
        this.memberRepository = memberRepository;
        this.userDirectory = userDirectory;
        this.tenantService = tenantService;
        this.notificationService = notificationService;
    }

    public Optional<ChatThread> findThread(String threadId) {
        return threadRepository.findById(threadId);
    }

    public List<ChatThread> listThreads(String tenantId, String type, boolean allTenants) {
        if (allTenants) {
            return type == null || type.isBlank()
                    ? threadRepository.findAllByOrderByTenantIdAscLastMessageAtDesc()
                    : threadRepository.findByTypeOrderByLastMessageAtDesc(type);
        }
        return type == null || type.isBlank()
                ? threadRepository.findByTenantIdOrderByLastMessageAtDesc(tenantId)
                : threadRepository.findByTenantIdAndTypeOrderByLastMessageAtDesc(tenantId, type);
    }

    public List<ChatThread> listMemberThreads(String memberId) {
        return threadRepository.findByMemberIdAndTypeOrderByLastMessageAtDesc(memberId, ChatThread.TYPE_MEMBER_SUPPORT);
    }

    @Transactional
    public ChatThread createThread(
            String tenantId,
            String type,
            String memberId,
            String subject,
            String createdByUserId,
            String createdByMemberId) {
        ChatThread thread = new ChatThread(
                "thread_" + UUID.randomUUID(),
                tenantId,
                type,
                memberId,
                subject,
                "open",
                null,
                createdByUserId,
                createdByMemberId);
        return threadRepository.save(thread);
    }

    @Transactional
    public ChatMessage addMessage(ChatThread thread, String senderType, String senderId, String body) {
        ChatMessage message = messageRepository.save(new ChatMessage(
                "msg_" + UUID.randomUUID(),
                thread.getId(),
                thread.getTenantId(),
                senderType,
                senderId,
                body));
        thread.touch(message.getCreatedAt());
        markRead(thread, senderType, message.getCreatedAt());
        threadRepository.save(thread);
        notifyMemberOfReply(thread, senderType, message);
        return message;
    }

    private void notifyMemberOfReply(ChatThread thread, String senderType, ChatMessage message) {
        if (!ChatThread.TYPE_MEMBER_SUPPORT.equals(thread.getType())) return;
        if (ChatMessage.SENDER_MEMBER.equals(senderType)) return;
        if (thread.getMemberId() == null || thread.getMemberId().isBlank()) return;
        memberRepository.findById(thread.getMemberId()).ifPresent(member ->
                notificationService.notifyChatReply(member, thread.getId(), thread.getSubject(), preview(message.getBody())));
    }

    @Transactional
    public void markRead(ChatThread thread, String role, Instant at) {
        switch (role) {
            case ChatMessage.SENDER_MEMBER -> thread.markMemberRead(at);
            case ChatMessage.SENDER_PLATFORM -> thread.markPlatformRead(at);
            default -> thread.markStaffRead(at);
        }
        threadRepository.save(thread);
    }

    public List<ChatMessageResponse> messages(String threadId) {
        return messageRepository.findByThreadIdOrderByCreatedAtAsc(threadId).stream()
                .map(this::toMessageResponse)
                .toList();
    }

    public ChatMessageResponse toMessageResponse(ChatMessage message) {
        return new ChatMessageResponse(
                message.getId(),
                message.getThreadId(),
                message.getSenderType(),
                message.getSenderId(),
                resolveSenderName(message.getSenderType(), message.getSenderId()),
                message.getBody(),
                message.getCreatedAt());
    }

    public ChatThreadResponse toThreadResponse(ChatThread thread, String viewerRole) {
        Instant lastRead = lastReadFor(thread, viewerRole);
        long unread = messageRepository.countByThreadIdAndCreatedAtAfter(
                thread.getId(),
                lastRead == null ? Instant.EPOCH : lastRead);
        ChatMessage latest = messageRepository.findFirstByThreadIdOrderByCreatedAtDesc(thread.getId()).orElse(null);
        return new ChatThreadResponse(
                thread.getId(),
                thread.getTenantId(),
                tenantService.findById(thread.getTenantId()).map(t -> t.name()).orElse(thread.getTenantId()),
                thread.getType(),
                thread.getMemberId(),
                memberName(thread.getMemberId()),
                thread.getSubject(),
                thread.getStatus(),
                thread.getComplaintId(),
                thread.getLastMessageAt(),
                latest == null ? "" : preview(latest.getBody()),
                latest == null ? null : latest.getSenderType(),
                unread,
                thread.getCreatedAt(),
                thread.getUpdatedAt());
    }

    private Instant lastReadFor(ChatThread thread, String role) {
        return switch (role) {
            case ChatMessage.SENDER_MEMBER -> thread.getMemberLastReadAt();
            case ChatMessage.SENDER_PLATFORM -> thread.getPlatformLastReadAt();
            default -> thread.getStaffLastReadAt();
        };
    }

    private String resolveSenderName(String senderType, String senderId) {
        if (ChatMessage.SENDER_MEMBER.equals(senderType)) {
            String name = memberName(senderId);
            return name == null ? "Member" : name;
        }
        if ("system".equals(senderId)) {
            return "System";
        }
        return userDirectory.displayName(senderId)
                .orElse(ChatMessage.SENDER_PLATFORM.equals(senderType) ? "Platform Super Admin" : "SACCO staff");
    }

    private String memberName(String memberId) {
        if (memberId == null || memberId.isBlank()) return null;
        return memberRepository.findById(memberId).map(Member::getFullName).orElse(null);
    }

    private String preview(String body) {
        if (body == null) return "";
        String trimmed = body.strip();
        return trimmed.length() <= PREVIEW_LENGTH ? trimmed : trimmed.substring(0, PREVIEW_LENGTH) + "…";
    }
}
