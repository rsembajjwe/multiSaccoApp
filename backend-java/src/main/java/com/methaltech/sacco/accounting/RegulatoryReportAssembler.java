package com.methaltech.sacco.accounting;

import com.methaltech.sacco.member.DataProtectionEvidence;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

final class RegulatoryReportAssembler {

    private RegulatoryReportAssembler() {
    }

    static RegulatoryTenantReport consolidate(List<RegulatoryTenantReport> reports) {
        BigDecimal loanPortfolio = reports.stream().map(RegulatoryTenantReport::getLoanPortfolio).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal loansAtRisk = reports.stream().map(RegulatoryTenantReport::getLoansAtRisk).reduce(BigDecimal.ZERO, BigDecimal::add);
        int reconciliationExceptions = reports.stream().mapToInt(RegulatoryTenantReport::getReconciliationExceptions).sum();
        int unbalanced = reports.stream().mapToInt(RegulatoryTenantReport::getUnbalancedJournalEntries).sum();
        DataProtectionEvidence dataProtectionEvidence = consolidateDataProtectionEvidence(reports);
        return RegulatoryTenantReport.builder()
                .tenantId("consolidated")
                .tenantName("Consolidated")
                .memberCount(reports.stream().mapToInt(RegulatoryTenantReport::getMemberCount).sum())
                .activeMembers(reports.stream().mapToInt(RegulatoryTenantReport::getActiveMembers).sum())
                .savings(reports.stream().map(RegulatoryTenantReport::getSavings).reduce(BigDecimal.ZERO, BigDecimal::add))
                .shares(reports.stream().map(RegulatoryTenantReport::getShares).reduce(BigDecimal.ZERO, BigDecimal::add))
                .welfare(reports.stream().map(RegulatoryTenantReport::getWelfare).reduce(BigDecimal.ZERO, BigDecimal::add))
                .loanPortfolio(loanPortfolio)
                .activeLoans(reports.stream().mapToInt(RegulatoryTenantReport::getActiveLoans).sum())
                .loansAtRisk(loansAtRisk)
                .parPercent(percent(loansAtRisk, loanPortfolio))
                .expenseTotal(reports.stream().map(RegulatoryTenantReport::getExpenseTotal).reduce(BigDecimal.ZERO, BigDecimal::add))
                .assetCost(reports.stream().map(RegulatoryTenantReport::getAssetCost).reduce(BigDecimal.ZERO, BigDecimal::add))
                .assetNetBookValue(reports.stream().map(RegulatoryTenantReport::getAssetNetBookValue).reduce(BigDecimal.ZERO, BigDecimal::add))
                .journalEntries(reports.stream().mapToInt(RegulatoryTenantReport::getJournalEntries).sum())
                .unbalancedJournalEntries(unbalanced)
                .reconciliationExceptions(reconciliationExceptions)
                .openComplaints(reports.stream().mapToInt(RegulatoryTenantReport::getOpenComplaints).sum())
                .openResolutions(reports.stream().mapToInt(RegulatoryTenantReport::getOpenResolutions).sum())
                .dataProtectionEvidence(dataProtectionEvidence)
                .complianceStatus(unbalanced == 0 && reconciliationExceptions == 0 && "ready".equals(dataProtectionEvidence.evidenceStatus()) ? "clear" : "review")
                .build();
    }

    static DataProtectionEvidence consolidateDataProtectionEvidence(List<RegulatoryTenantReport> reports) {
        int openPrivacyRequests = reports.stream().map(RegulatoryTenantReport::getDataProtectionEvidence).mapToInt(DataProtectionEvidence::openPrivacyRequests).sum();
        int reviewDue = reports.stream().map(RegulatoryTenantReport::getDataProtectionEvidence).mapToInt(DataProtectionEvidence::kycDocumentsReviewDue).sum();
        int disposed = reports.stream().map(RegulatoryTenantReport::getDataProtectionEvidence).mapToInt(DataProtectionEvidence::kycDocumentsDisposed).sum();
        int storageActions = reports.stream().map(RegulatoryTenantReport::getDataProtectionEvidence).mapToInt(DataProtectionEvidence::kycStorageActions).sum();
        return new DataProtectionEvidence(
                reports.stream().map(RegulatoryTenantReport::getDataProtectionEvidence).mapToInt(DataProtectionEvidence::privacyNoticeAcceptedMembers).sum(),
                reports.stream().map(RegulatoryTenantReport::getDataProtectionEvidence).mapToInt(DataProtectionEvidence::membersWithConsentUpdated).sum(),
                reports.stream().map(RegulatoryTenantReport::getDataProtectionEvidence).mapToInt(DataProtectionEvidence::privacyRequests).sum(),
                openPrivacyRequests,
                reports.stream().map(RegulatoryTenantReport::getDataProtectionEvidence).mapToInt(DataProtectionEvidence::completedPrivacyRequests).sum(),
                reports.stream().map(RegulatoryTenantReport::getDataProtectionEvidence).mapToInt(DataProtectionEvidence::erasureRequestsCompleted).sum(),
                reports.stream().map(RegulatoryTenantReport::getDataProtectionEvidence).mapToInt(DataProtectionEvidence::kycDocuments).sum(),
                reviewDue,
                reports.stream().map(RegulatoryTenantReport::getDataProtectionEvidence).mapToInt(DataProtectionEvidence::kycDocumentsRetained).sum(),
                disposed,
                storageActions,
                reports.stream().map(RegulatoryTenantReport::getDataProtectionEvidence).mapToInt(DataProtectionEvidence::kycStorageDeletes).sum(),
                reports.stream().map(RegulatoryTenantReport::getDataProtectionEvidence).mapToInt(DataProtectionEvidence::kycStorageMissing).sum(),
                reports.stream().map(RegulatoryTenantReport::getDataProtectionEvidence).mapToInt(DataProtectionEvidence::kycStorageDemoNoop).sum(),
                openPrivacyRequests == 0 && reviewDue == 0 && disposed == storageActions ? "ready" : "review");
    }

    static int percent(BigDecimal numerator, BigDecimal denominator) {
        if (denominator.compareTo(BigDecimal.ZERO) == 0) return 0;
        return numerator.multiply(BigDecimal.valueOf(100))
                .divide(denominator, 0, RoundingMode.HALF_UP)
                .intValue();
    }

    static String csv(List<RegulatoryTenantReport> reports) {
        String header = "\"tenant\",\"members\",\"active_members\",\"savings\",\"shares\",\"welfare\",\"loan_portfolio\",\"active_loans\",\"expenses\",\"fixed_assets\",\"net_assets\",\"par_percent\",\"reconciliation_exceptions\",\"open_complaints\",\"open_resolutions\",\"privacy_requests\",\"open_privacy_requests\",\"completed_privacy_requests\",\"erasure_requests_completed\",\"kyc_documents\",\"kyc_review_due\",\"kyc_disposed\",\"kyc_storage_actions\",\"data_protection_status\",\"compliance_status\"";
        List<String> rows = reports.stream()
                .map(report -> csvRow(List.of(
                        report.getTenantName(),
                        report.getMemberCount(),
                        report.getActiveMembers(),
                        report.getSavings(),
                        report.getShares(),
                        report.getWelfare(),
                        report.getLoanPortfolio(),
                        report.getActiveLoans(),
                        report.getExpenseTotal(),
                        report.getAssetCost(),
                        report.getAssetNetBookValue(),
                        report.getParPercent(),
                        report.getReconciliationExceptions(),
                        report.getOpenComplaints(),
                        report.getOpenResolutions(),
                        report.getDataProtectionEvidence().privacyRequests(),
                        report.getDataProtectionEvidence().openPrivacyRequests(),
                        report.getDataProtectionEvidence().completedPrivacyRequests(),
                        report.getDataProtectionEvidence().erasureRequestsCompleted(),
                        report.getDataProtectionEvidence().kycDocuments(),
                        report.getDataProtectionEvidence().kycDocumentsReviewDue(),
                        report.getDataProtectionEvidence().kycDocumentsDisposed(),
                        report.getDataProtectionEvidence().kycStorageActions(),
                        report.getDataProtectionEvidence().evidenceStatus(),
                        report.getComplianceStatus())))
                .toList();
        return Stream.concat(Stream.of(header), rows.stream())
                .collect(Collectors.joining("\n"));
    }

    private static String csvRow(List<?> values) {
        return values.stream()
                .map(value -> "\"" + String.valueOf(value).replace("\"", "\"\"") + "\"")
                .collect(Collectors.joining(","));
    }
}
