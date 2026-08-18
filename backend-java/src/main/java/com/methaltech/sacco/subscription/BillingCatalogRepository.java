package com.methaltech.sacco.subscription;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface BillingCatalogRepository extends JpaRepository<BillingCatalogItem, String> {

    List<BillingCatalogItem> findAllByOrderByCategoryAscCodeAsc();
}
