package com.methaltech.sacco.notification;

public final class SmsMessageSegments {

    private SmsMessageSegments() {
    }

    public static int count(String message) {
        int length = message == null ? 0 : message.trim().length();
        if (length <= 0) return 0;
        if (length <= 160) return 1;
        return (length + 152) / 153;
    }
}
