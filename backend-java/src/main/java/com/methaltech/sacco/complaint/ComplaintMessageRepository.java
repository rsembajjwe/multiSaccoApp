package com.methaltech.sacco.complaint;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ComplaintMessageRepository extends JpaRepository<ComplaintMessage, String> {
    List<ComplaintMessage> findByComplaintIdOrderByCreatedAtAsc(String complaintId);
    List<ComplaintMessage> findByComplaintIdAndVisibilityOrderByCreatedAtAsc(String complaintId, String visibility);
}
