package com.methaltech.sacco.member;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface MemberNextOfKinRepository extends JpaRepository<MemberNextOfKin, String> {
    List<MemberNextOfKin> findByMemberIdOrderByCreatedAtDesc(String memberId);
}
