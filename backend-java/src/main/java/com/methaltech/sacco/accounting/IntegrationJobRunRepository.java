package com.methaltech.sacco.accounting;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface IntegrationJobRunRepository extends JpaRepository<IntegrationJobRun, String> {
    Optional<IntegrationJobRun> findFirstByJobNameOrderByFinishedAtDesc(String jobName);

    List<IntegrationJobRun> findTop50ByOrderByFinishedAtDesc();

    List<IntegrationJobRun> findTop50ByJobNameOrderByFinishedAtDesc(String jobName);
}
