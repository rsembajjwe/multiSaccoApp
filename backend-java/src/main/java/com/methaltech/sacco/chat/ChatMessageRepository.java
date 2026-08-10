package com.methaltech.sacco.chat;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, String> {

    List<ChatMessage> findByThreadIdOrderByCreatedAtAsc(String threadId);

    Optional<ChatMessage> findFirstByThreadIdOrderByCreatedAtDesc(String threadId);

    long countByThreadId(String threadId);

    long countByThreadIdAndCreatedAtAfter(String threadId, Instant after);
}
