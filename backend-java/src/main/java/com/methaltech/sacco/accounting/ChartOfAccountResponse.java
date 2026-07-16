package com.methaltech.sacco.accounting;

record ChartOfAccountResponse(
        String code,
        String name,
        String type,
        String normalBalance) {

    static ChartOfAccountResponse from(ChartOfAccount account) {
        return new ChartOfAccountResponse(
                account.getCode(),
                account.getName(),
                account.getType(),
                account.getNormalBalance());
    }
}
