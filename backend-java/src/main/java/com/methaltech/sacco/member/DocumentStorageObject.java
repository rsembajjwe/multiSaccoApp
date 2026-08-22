package com.methaltech.sacco.member;

record DocumentStorageObject(
        String storageKey,
        String filename,
        String contentType,
        byte[] content) {
}
