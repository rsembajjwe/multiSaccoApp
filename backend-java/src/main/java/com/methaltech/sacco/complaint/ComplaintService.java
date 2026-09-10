package com.methaltech.sacco.complaint;

import com.methaltech.sacco.member.Member;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class ComplaintService {

    public static final Set<String> CATEGORIES = Set.of("statement", "loan", "savings", "shares", "service", "other");
    public static final Set<String> CHANNELS = Set.of("branch", "mobile", "mobile_offline_sync", "phone", "email", "web");
    public static final Set<String> PRIORITIES = Set.of("low", "medium", "high", "urgent");
    public static final Set<String> STATUSES = Set.of(
            "open",
            "acknowledged",
            "in_progress",
            "referred_to_treasurer",
            "escalated_to_chairman",
            "awaiting_member_response",
            "resolved",
            "closed",
            "reopened");

    private final ComplaintRepository complaintRepository;
    private final ComplaintMessageRepository complaintMessageRepository;

    ComplaintService(
            ComplaintRepository complaintRepository,
            ComplaintMessageRepository complaintMessageRepository) {
        this.complaintRepository = complaintRepository;
        this.complaintMessageRepository = complaintMessageRepository;
    }

    public Complaint createStaffComplaint(
            String tenantId,
            String memberId,
            String category,
            String subject,
            String description,
            String channel,
            String priority,
            String assignedUserId,
            String createdByUserId) {
        Complaint complaint = complaintRepository.save(new Complaint(
                "complaint_" + UUID.randomUUID(),
                tenantId,
                memberId,
                category,
                subject,
                description,
                channel,
                priority,
                "open",
                assignedUserId,
                createdByUserId,
                null));
        addStaffMessage(complaint, createdByUserId, "opened", "member_visible", description);
        return complaint;
    }

    public Complaint createMemberComplaint(
            Member member,
            String category,
            String subject,
            String description,
            String priority) {
        Complaint complaint = complaintRepository.save(new Complaint(
                "complaint_" + UUID.randomUUID(),
                member.getTenantId(),
                member.getId(),
                category,
                subject,
                description,
                "mobile_offline_sync",
                priority,
                "open",
                null,
                null,
                member.getId()));
        addMemberMessage(complaint, member.getId(), "opened", description);
        return complaint;
    }

    public ComplaintMessage addStaffMessage(
            Complaint complaint,
            String userId,
            String action,
            String visibility,
            String message) {
        if (message == null || message.isBlank()) return null;
        return complaintMessageRepository.save(new ComplaintMessage(
                "complaint_msg_" + UUID.randomUUID(),
                complaint.getId(),
                complaint.getTenantId(),
                "staff",
                userId,
                null,
                visibility,
                action,
                message.trim()));
    }

    public ComplaintMessage addMemberMessage(
            Complaint complaint,
            String memberId,
            String action,
            String message) {
        if (message == null || message.isBlank()) return null;
        return complaintMessageRepository.save(new ComplaintMessage(
                "complaint_msg_" + UUID.randomUUID(),
                complaint.getId(),
                complaint.getTenantId(),
                "member",
                null,
                memberId,
                "member_visible",
                action,
                message.trim()));
    }
}
