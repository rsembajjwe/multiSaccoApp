package com.methaltech.sacco.tenant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;

class OrganizationCodeGeneratorTest {

    private final TenantRepository tenantRepository = mock(TenantRepository.class);
    private final OrganizationCodeGenerator generator = new OrganizationCodeGenerator(tenantRepository);

    @Test
    void derivesCodeForGroupsCbosAndSaccos() {
        assertThat(generator.baseCode("Green Valley SACCO")).isEqualTo("GREE");
        assertThat(generator.baseCode("Hope Women CBO")).isEqualTo("HOPE");
        assertThat(generator.baseCode("Kampala Traders Group")).isEqualTo("KAMP");
    }

    @Test
    void allocatesAnotherCodeWhenTheDerivedCodeExists() {
        when(tenantRepository.existsByAbbreviationIgnoreCase("GREE")).thenReturn(true);
        when(tenantRepository.existsByAbbreviationIgnoreCase("GRAA")).thenReturn(true);

        assertThat(generator.nextCode("Green Valley SACCO")).isEqualTo("GRAB");
    }
}
