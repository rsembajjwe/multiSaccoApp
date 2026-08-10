package com.methaltech.sacco.member;

class DocumentStorageException extends RuntimeException {
    DocumentStorageException(String message) {
        super(message);
    }

    DocumentStorageException(String message, Throwable cause) {
        super(message, cause);
    }
}
