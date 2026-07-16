package com.methaltech.sacco.accounting;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "chart_of_accounts")
class ChartOfAccount {

    @Id
    private String code;

    private String name;

    private String type;

    private String normalBalance;

    protected ChartOfAccount() {
    }

    String getCode() {
        return code;
    }

    String getName() {
        return name;
    }

    String getType() {
        return type;
    }

    String getNormalBalance() {
        return normalBalance;
    }
}
