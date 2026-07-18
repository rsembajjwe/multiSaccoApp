package com.methaltech.sacco.accounting;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
class DemoMobileMoneyProvider implements MobileMoneyProvider {

    private final String providerId;

    DemoMobileMoneyProvider(@Value("${sacco.providers.mobile-money:demo_mobile_money}") String providerId) {
        this.providerId = providerId;
    }

    @Override
    public String providerId() {
        return providerId;
    }
}
