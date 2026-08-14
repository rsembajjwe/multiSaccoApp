package com.methaltech.sacco.accounting;

import com.methaltech.sacco.money.Money;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Function;
import java.util.function.Predicate;

final class StatementImportValidator {

    private StatementImportValidator() {
    }

    static List<ValidationError> validate(
            List<ImportLine> lines,
            Predicate<String> existingReference,
            Predicate<LocalDate> closedPeriod,
            Function<LocalDate, String> periodKey) {
        List<ValidationError> errors = new ArrayList<>();
        Set<String> seenReferences = new HashSet<>();
        for (int index = 0; index < lines.size(); index++) {
            ImportLine line = lines.get(index);
            int rowNumber = index + 1;
            validateChannel(line, rowNumber, errors);
            validateAmount(line, rowNumber, errors);
            validateReference(line, rowNumber, seenReferences, existingReference, errors);
            validateStatementDate(line, rowNumber, closedPeriod, periodKey, errors);
        }
        return errors;
    }

    private static void validateChannel(ImportLine line, int rowNumber, List<ValidationError> errors) {
        if (line.channel() == null || line.channel().isBlank()) {
            errors.add(new ValidationError(rowNumber, "channel", "REQUIRED", "Statement channel is required."));
        } else if (!AccountingRules.statementChannel(line.channel())) {
            errors.add(new ValidationError(rowNumber, "channel", "INVALID_STATEMENT_CHANNEL", "Unsupported statement channel."));
        }
    }

    private static void validateAmount(ImportLine line, int rowNumber, List<ValidationError> errors) {
        if (line.amount() == null) {
            errors.add(new ValidationError(rowNumber, "amount", "REQUIRED", "Statement amount is required."));
        } else if (Money.normalize(line.amount()).compareTo(BigDecimal.ZERO) == 0) {
            errors.add(new ValidationError(rowNumber, "amount", "INVALID_STATEMENT_AMOUNT", "Statement amount cannot be zero."));
        }
    }

    private static void validateReference(
            ImportLine line,
            int rowNumber,
            Set<String> seenReferences,
            Predicate<String> existingReference,
            List<ValidationError> errors) {
        if (line.externalReference() == null || line.externalReference().isBlank()) {
            errors.add(new ValidationError(rowNumber, "externalReference", "REQUIRED", "Statement reference is required."));
            return;
        }
        String reference = line.externalReference().trim();
        if (!seenReferences.add(reference.toUpperCase())) {
            errors.add(new ValidationError(rowNumber, "externalReference", "DUPLICATE_REFERENCE_IN_FILE", "Statement reference is repeated in this import."));
        }
        if (existingReference.test(reference)) {
            errors.add(new ValidationError(rowNumber, "externalReference", "STATEMENT_LINE_EXISTS", "Statement line reference already exists."));
        }
    }

    private static void validateStatementDate(
            ImportLine line,
            int rowNumber,
            Predicate<LocalDate> closedPeriod,
            Function<LocalDate, String> periodKey,
            List<ValidationError> errors) {
        LocalDate statementDate = line.statementDate() == null ? LocalDate.now() : line.statementDate();
        if (closedPeriod.test(statementDate)) {
            errors.add(new ValidationError(
                    rowNumber,
                    "statementDate",
                    "ACCOUNTING_PERIOD_CLOSED",
                    "Accounting period " + periodKey.apply(statementDate) + " is closed."));
        }
    }

    record ImportLine(String channel, BigDecimal amount, String externalReference, LocalDate statementDate) {
    }

    record ValidationError(int rowNumber, String field, String code, String message) {
    }
}
