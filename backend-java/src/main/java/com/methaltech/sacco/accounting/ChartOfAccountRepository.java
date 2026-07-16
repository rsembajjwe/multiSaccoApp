package com.methaltech.sacco.accounting;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface ChartOfAccountRepository extends JpaRepository<ChartOfAccount, String> {
    List<ChartOfAccount> findAllByOrderByCodeAsc();
}
