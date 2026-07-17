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
    public static final Set<String> STATUSES = Set.of("open", "in_progress", "resolved", "closed");

    private final ComplaintRepository complaintRepository;

    ComplaintService(ComplaintRepository complaintRepository) {
        this.complaintRepository = complaintRepository;
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
        return complaintRepository.save(new Complaint(
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
    }

    public Complaint createMemberComplaint(
            Member member,
            String category,
            String subject,
            String description,
            String priority) {
        return complaintRepository.save(new Complaint(
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
    }
}
