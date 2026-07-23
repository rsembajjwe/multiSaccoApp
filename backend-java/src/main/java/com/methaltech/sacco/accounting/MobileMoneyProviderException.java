package com.methaltech.sacco.accounting;

class MobileMoneyProviderException extends RuntimeException {
    MobileMoneyProviderException(String message) {
        super(message);
    }

    MobileMoneyProviderException(String message, Throwable cause) {
        super(message, cause);
    }
}
