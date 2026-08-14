package com.methaltech.sacco.accounting;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class StatementImportValidatorTest {

    @Test
    void validStatementImportHasNoErrors() {
        List<StatementImportValidator.ValidationError> errors = validate(List.of(
                line("bank", "50000", "BNK-001", LocalDate.of(2026, 8, 10)),
                line(" mobile_money ", "-12000", "MM-002", LocalDate.of(2026, 8, 11))));

        assertThat(errors).isEmpty();
        assertThat(AccountingRules.statementChannel("payroll_deduction")).isTrue();
        assertThat(AccountingRules.statementChannel("operations")).isFalse();
    }

    @Test
    void validatesRequiredChannelAndAmountAndReference() {
        List<StatementImportValidator.ValidationError> errors = validate(List.of(
                new StatementImportValidator.ImportLine(" ", null, " ", LocalDate.of(2026, 8, 10))));

        assertThat(errors).extracting(StatementImportValidator.ValidationError::code)
                .containsExactly("REQUIRED", "REQUIRED", "REQUIRED");
        assertThat(errors).extracting(StatementImportValidator.ValidationError::field)
                .containsExactly("channel", "amount", "externalReference");
    }

    @Test
    void rejectsUnsupportedChannelsAndZeroAmounts() {
        List<StatementImportValidator.ValidationError> errors = validate(List.of(
                line("cheque", "0.00", "BNK-001", LocalDate.of(2026, 8, 10))));

        assertThat(errors).extracting(StatementImportValidator.ValidationError::code)
                .containsExactly("INVALID_STATEMENT_CHANNEL", "INVALID_STATEMENT_AMOUNT");
    }

    @Test
    void detectsDuplicateReferencesCaseInsensitivelyWithinFile() {
        List<StatementImportValidator.ValidationError> errors = validate(List.of(
                line("bank", "50000", "bnk-001", LocalDate.of(2026, 8, 10)),
                line("bank", "70000", " BNK-001 ", LocalDate.of(2026, 8, 11))));

        assertThat(errors).hasSize(1);
        assertThat(errors.get(0).rowNumber()).isEqualTo(2);
        assertThat(errors.get(0).code()).isEqualTo("DUPLICATE_REFERENCE_IN_FILE");
    }

    @Test
    void detectsExistingReferencesAndClosedPeriods() {
        LocalDate closedDate = LocalDate.of(2026, 7, 31);
        List<StatementImportValidator.ValidationError> errors = StatementImportValidator.validate(
                List.of(line("bank", "50000", "BNK-EXISTS", closedDate)),
                Set.of("BNK-EXISTS")::contains,
                date -> date.equals(closedDate),
                date -> date.toString().substring(0, 7));

        assertThat(errors).extracting(StatementImportValidator.ValidationError::code)
                .containsExactly("STATEMENT_LINE_EXISTS", "ACCOUNTING_PERIOD_CLOSED");
        assertThat(errors.get(1).message()).contains("2026-07");
    }

    @Test
    void nullStatementDateUsesTodayForClosedPeriodCheck() {
        List<StatementImportValidator.ValidationError> errors = StatementImportValidator.validate(
                List.of(line("cash", "1000", "CASH-001", null)),
                reference -> false,
                date -> date.equals(LocalDate.now()),
                date -> "current");

        assertThat(errors).extracting(StatementImportValidator.ValidationError::code)
                .containsExactly("ACCOUNTING_PERIOD_CLOSED");
    }

    private static List<StatementImportValidator.ValidationError> validate(List<StatementImportValidator.ImportLine> lines) {
        return StatementImportValidator.validate(
                lines,
                reference -> false,
                date -> false,
                date -> date.toString().substring(0, 7));
    }

    private static StatementImportValidator.ImportLine line(
            String channel,
            String amount,
            String reference,
            LocalDate statementDate) {
        return new StatementImportValidator.ImportLine(
                channel,
                amount == null ? null : new BigDecimal(amount),
                reference,
                statementDate);
    }
}
