package com.methaltech.sacco.notification;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.SyncTaskExecutor;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * Executor for background notification work (currently SACCO broadcasts). Broadcasting to every member
 * runs off the request thread so a large SACCO cannot block or time out the HTTP call, and the bounded
 * pool + caller-runs policy keeps outbound provider bursts under control.
 *
 * <p>When {@code sacco.notifications.broadcast-async=false} the executor is synchronous — used by tests so
 * broadcast side effects are observable immediately without racing an async thread.
 */
@Configuration
@EnableAsync
class NotificationAsyncConfig {

    static final String EXECUTOR = "notificationExecutor";

    @Bean(EXECUTOR)
    @ConditionalOnProperty(name = "sacco.notifications.broadcast-async", havingValue = "true", matchIfMissing = true)
    Executor notificationExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("notify-broadcast-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.initialize();
        return executor;
    }

    @Bean(EXECUTOR)
    @ConditionalOnProperty(name = "sacco.notifications.broadcast-async", havingValue = "false")
    Executor synchronousNotificationExecutor() {
        return new SyncTaskExecutor();
    }
}
