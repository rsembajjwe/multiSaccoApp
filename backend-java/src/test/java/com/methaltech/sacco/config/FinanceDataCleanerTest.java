package com.methaltech.sacco.config;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.atLeast;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;

class FinanceDataCleanerTest {

    @Test
    void clearsLocalFinanceDataAndWritesAuditEvidence() throws Exception {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        Environment environment = mock(Environment.class);
        when(environment.getActiveProfiles()).thenReturn(new String[] {"dev"});
        when(jdbcTemplate.update(anyString())).thenReturn(1);

        new FinanceDataCleaner(jdbcTemplate, environment).run(null);

        verify(jdbcTemplate, atLeast(15)).update(anyString());
        verify(jdbcTemplate).update(anyString(), any(Object[].class));
    }

    @Test
    void refusesToClearFinanceDataInProduction() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        Environment environment = mock(Environment.class);
        when(environment.getActiveProfiles()).thenReturn(new String[] {"prod"});

        assertThrows(IllegalStateException.class, () -> new FinanceDataCleaner(jdbcTemplate, environment).run(null));

        verify(jdbcTemplate, never()).update(anyString());
    }
}
