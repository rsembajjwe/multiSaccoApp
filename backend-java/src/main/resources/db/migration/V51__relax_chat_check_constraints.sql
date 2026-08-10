-- H2 (PostgreSQL mode) rejects Hibernate's parameterized INSERT/UPDATE statements against the
-- string IN(...) CHECK constraints on the chat tables, even for valid values (MEMBER_SUPPORT /
-- MEMBER / STAFF / PLATFORM). This blocked members and staff from posting chat messages.
--
-- Thread type and message sender type are already validated in the application layer
-- (ChatController, MemberChatController), so the DB-level CHECK constraints are dropped here to
-- restore chat message posting. This runs cleanly on both H2 and PostgreSQL.

ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chk_chat_messages_sender_type;
ALTER TABLE chat_threads DROP CONSTRAINT IF EXISTS chk_chat_threads_type;
