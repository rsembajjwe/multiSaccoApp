package com.methaltech.sacco.subscription;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface SubscriptionPackageRepository extends JpaRepository<SubscriptionPackage, String> {
    List<SubscriptionPackage> findByStatusOrderByMemberLimitAsc(String status);
}
