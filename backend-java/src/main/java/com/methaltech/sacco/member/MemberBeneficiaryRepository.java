package com.methaltech.sacco.member;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface MemberBeneficiaryRepository extends JpaRepository<MemberBeneficiary, String> {
    List<MemberBeneficiary> findByMemberIdOrderByCreatedAtDesc(String memberId);
}
