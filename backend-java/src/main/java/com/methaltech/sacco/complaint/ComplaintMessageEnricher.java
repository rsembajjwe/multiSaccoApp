package com.methaltech.sacco.complaint;

import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberRepository;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Fills in a complaint message's sender identity for display: for a staff
 * reply, the officer's role title (Secretary / Chairperson / Treasurer …); for
 * a member's message, their name and membership number. Kept in one place so
 * the staff app and the member app label senders the same way.
 */
@Component
@RequiredArgsConstructor
public class ComplaintMessageEnricher {

    private final JdbcTemplate jdbcTemplate;
    private final MemberRepository memberRepository;

    public List<ComplaintMessageResponse> enrich(List<ComplaintMessage> messages) {
        Set<String> memberIds = new HashSet<>();
        for (ComplaintMessage m : messages) {
            if (m.getSenderMemberId() != null && !m.getSenderMemberId().isBlank()) {
                memberIds.add(m.getSenderMemberId());
            }
        }
        Map<String, Member> members = new HashMap<>();
        for (Member member : memberRepository.findAllById(memberIds)) {
            members.put(member.getId(), member);
        }
        Map<String, String[]> staffCache = new HashMap<>();

        List<ComplaintMessageResponse> out = new ArrayList<>(messages.size());
        for (ComplaintMessage m : messages) {
            String name = "";
            String role = "";
            String code = "";
            if ("member".equals(m.getSenderType())) {
                Member member =
                        m.getSenderMemberId() == null ? null : members.get(m.getSenderMemberId());
                if (member != null) {
                    name = nz(member.getFullName());
                    code = nz(member.getMembershipNo());
                }
            } else if (m.getSenderUserId() != null && !m.getSenderUserId().isBlank()) {
                String[] info = staffCache.computeIfAbsent(m.getSenderUserId(), this::lookupStaff);
                name = info[0];
                role = info[1];
            }
            out.add(ComplaintMessageResponse.from(m, name, role, code));
        }
        return out;
    }

    /** Returns [fullName, roleTitle] for a staff user; blanks if unknown. */
    private String[] lookupStaff(String userId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                """
                SELECT u.full_name AS full_name, r.name AS role_name
                FROM users u
                LEFT JOIN user_roles ur ON ur.user_id = u.id AND ur.tenant_id = u.tenant_id
                LEFT JOIN roles r ON r.id = ur.role_id AND r.tenant_id = u.tenant_id
                WHERE u.id = ?
                ORDER BY r.name
                """,
                userId);
        if (rows.isEmpty()) {
            return new String[] {"", ""};
        }
        String fullName = nz(rows.get(0).get("full_name"));
        String role = "";
        for (Map<String, Object> row : rows) {
            String candidate = nz(row.get("role_name"));
            if (!candidate.isBlank()) {
                role = candidate;
                break;
            }
        }
        return new String[] {fullName, role};
    }

    private static String nz(Object value) {
        return value == null ? "" : value.toString();
    }
}
