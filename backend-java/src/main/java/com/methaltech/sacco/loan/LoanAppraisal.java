package com.methaltech.sacco.loan;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * A loans officer's credit appraisal recorded before the loan committee decides:
 * affordability notes plus a recommend/decline outcome and a recommended amount/term.
 */
@Entity
@Table(name = "loan_appraisals")
public class LoanAppraisal {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "loan_id")
    private String loanId;

    @Column(name = "appraised_by_user_id")
    private String appraisedByUserId;

    private String recommendation;

    @Column(name = "recommended_amount")
    private BigDecimal recommendedAmount;

    @Column(name = "recommended_term_months")
    private Integer recommendedTermMonths;

    private String notes;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    protected LoanAppraisal() {
    }

    public static LoanAppraisal record(
            String id,
            String tenantId,
            String loanId,
            String appraisedByUserId,
            String recommendation,
            BigDecimal recommendedAmount,
            Integer recommendedTermMonths,
            String notes) {
        LoanAppraisal appraisal = new LoanAppraisal();
        appraisal.id = id;
        appraisal.tenantId = tenantId;
        appraisal.loanId = loanId;
        appraisal.appraisedByUserId = appraisedByUserId;
        appraisal.recommendation = recommendation;
        appraisal.recommendedAmount = recommendedAmount;
        appraisal.recommendedTermMonths = recommendedTermMonths;
        appraisal.notes = notes;
        appraisal.createdAt = Instant.now();
        appraisal.updatedAt = appraisal.createdAt;
        return appraisal;
    }

    public String getId() {
        return id;
    }

    public String getTenantId() {
        return tenantId;
    }

    public String getLoanId() {
        return loanId;
    }

    public String getAppraisedByUserId() {
        return appraisedByUserId;
    }

    public String getRecommendation() {
        return recommendation;
    }

    public BigDecimal getRecommendedAmount() {
        return recommendedAmount;
    }

    public Integer getRecommendedTermMonths() {
        return recommendedTermMonths;
    }

    public String getNotes() {
        return notes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
