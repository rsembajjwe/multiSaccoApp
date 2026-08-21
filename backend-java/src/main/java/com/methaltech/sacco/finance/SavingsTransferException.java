package com.methaltech.sacco.finance;

/** Signals a savings-transfer posting failure with an API error code and HTTP status. */
class SavingsTransferException extends RuntimeException {

    private final int status;
    private final String code;

    SavingsTransferException(int status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    int status() {
        return status;
    }

    String code() {
        return code;
    }
}
