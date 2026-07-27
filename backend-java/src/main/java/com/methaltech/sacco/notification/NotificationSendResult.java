package com.methaltech.sacco.notification;

record NotificationSendResult(
        String status,
        String providerReference,
        String providerMessage) {

    static NotificationSendResult sent(String providerReference, String providerMessage) {
        return new NotificationSendResult("sent", providerReference, providerMessage);
    }

    static NotificationSendResult failed(String providerMessage) {
        return new NotificationSendResult("failed", null, providerMessage);
    }
}
