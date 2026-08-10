package com.methaltech.sacco.member;

record DocumentStorageActionResult(String action, String detail) {
    static DocumentStorageActionResult of(String action, String detail) {
        return new DocumentStorageActionResult(action, detail == null ? "" : detail);
    }
}
