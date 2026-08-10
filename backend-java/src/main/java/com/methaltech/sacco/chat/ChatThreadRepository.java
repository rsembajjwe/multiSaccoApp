package com.methaltech.sacco.chat;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatThreadRepository extends JpaRepository<ChatThread, String> {

    List<ChatThread> findByTenantIdOrderByLastMessageAtDesc(String tenantId);

    List<ChatThread> findByTenantIdAndTypeOrderByLastMessageAtDesc(String tenantId, String type);

    List<ChatThread> findByTypeOrderByLastMessageAtDesc(String type);

    List<ChatThread> findAllByOrderByTenantIdAscLastMessageAtDesc();

    List<ChatThread> findByMemberIdAndTypeOrderByLastMessageAtDesc(String memberId, String type);

    Optional<ChatThread> findByComplaintId(String complaintId);
}
