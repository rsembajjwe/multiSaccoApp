package com.methaltech.sacco.notification;

final class SmsMessageSegments {

    private SmsMessageSegments() {
    }

    static int count(String message) {
        int length = message == null ? 0 : message.trim().length();
        if (length <= 0) return 0;
        if (length <= 160) return 1;
        return (length + 152) / 153;
    }
}
