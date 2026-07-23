package com.methaltech.sacco.loan;

import java.math.BigDecimal;
import java.time.LocalDate;

record LoanRepaymentScheduleResponse(
        String id,
        String tenantId,
        String loanId,
        int installmentNo,
        LocalDate dueDate,
        BigDecimal principalDue,
        BigDecimal interestDue,
        BigDecimal totalDue,
        BigDecimal paidAmount,
        BigDecimal balanceDue,
        String status) {

    static LoanRepaymentScheduleResponse from(LoanRepaymentSchedule schedule, BigDecimal paidAmount, String status) {
        BigDecimal safePaid = paidAmount == null ? BigDecimal.ZERO : paidAmount;
        BigDecimal balanceDue = schedule.getTotalDue().subtract(safePaid);
        if (balanceDue.compareTo(BigDecimal.ZERO) < 0) balanceDue = BigDecimal.ZERO;
        return new LoanRepaymentScheduleResponse(
                schedule.getId(),
                schedule.getTenantId(),
                schedule.getLoanId(),
                schedule.getInstallmentNo(),
                schedule.getDueDate(),
                schedule.getPrincipalDue(),
                schedule.getInterestDue(),
                schedule.getTotalDue(),
                safePaid,
                balanceDue,
                status);
    }
}
