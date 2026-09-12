package com.methaltech.sacco.finance;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface TreasuryCashEntryRepository extends JpaRepository<TreasuryCashEntry, String> {
    List<TreasuryCashEntry> findByTenantIdOrderByEntryDateDescCreatedAtDesc(String tenantId);
}
