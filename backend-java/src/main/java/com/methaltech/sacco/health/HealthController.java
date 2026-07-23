package com.methaltech.sacco.health;

import com.methaltech.sacco.api.ApiResponse;
import java.time.Instant;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
class HealthController {

    private final boolean demoLoginsEnabled;

    HealthController(@Value("${sacco.demo-logins.enabled:true}") boolean demoLoginsEnabled) {
        this.demoLoginsEnabled = demoLoginsEnabled;
    }

    @GetMapping("/health")
    ApiResponse<Map<String, Object>> health() {
        return ApiResponse.of(Map.of(
                "ok", true,
                "service", "multiSaccoApp Java API",
                "version", "0.1.0",
                "demoLoginsEnabled", demoLoginsEnabled,
                "timestamp", Instant.now().toString()));
    }
}
