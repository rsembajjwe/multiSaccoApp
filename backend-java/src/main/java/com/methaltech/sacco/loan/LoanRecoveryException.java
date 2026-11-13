package com.methaltech.sacco.loan;

final class LoanRecoveryException extends RuntimeException {
    private final int status;
    private final String code;

    LoanRecoveryException(int status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    int status() { return status; }
    String code() { return code; }
}
