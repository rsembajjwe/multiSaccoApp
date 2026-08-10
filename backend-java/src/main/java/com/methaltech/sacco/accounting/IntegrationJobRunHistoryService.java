package com.methaltech.sacco.accounting;

import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class IntegrationJobRunHistoryService {

    private final IntegrationJobRunRepository jobRunRepository;

    public IntegrationJobRunHistoryService(IntegrationJobRunRepository jobRunRepository) {
        this.jobRunRepository = jobRunRepository;
    }

    public List<IntegrationJobRunResponse> latest(String jobName) {
        List<IntegrationJobRun> runs = jobName == null || jobName.isBlank()
                ? jobRunRepository.findTop50ByOrderByFinishedAtDesc()
                : jobRunRepository.findTop50ByJobNameOrderByFinishedAtDesc(jobName.trim());
        return runs.stream()
                .map(IntegrationJobRunResponse::from)
                .toList();
    }
}
