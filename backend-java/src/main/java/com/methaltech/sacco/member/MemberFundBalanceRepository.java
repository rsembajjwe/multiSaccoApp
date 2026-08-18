package com.methaltech.sacco.member;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberFundBalanceRepository extends JpaRepository<MemberFundBalance, String> {

    List<MemberFundBalance> findByMemberIdOrderByFundCodeAsc(String memberId);

    Optional<MemberFundBalance> findByMemberIdAndFundCode(String memberId, String fundCode);
}
