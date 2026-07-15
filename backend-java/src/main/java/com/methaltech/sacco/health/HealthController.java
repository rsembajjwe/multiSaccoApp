package com.methaltech.sacco.health;

import com.methaltech.sacco.api.ApiResponse;
import java.time.Instant;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
class HealthController {

    @GetMapping("/health")
    ApiResponse<Map<String, Object>> health() {
        return ApiResponse.of(Map.of(
                "ok", true,
                "service", "multiSaccoApp Java API",
                "version", "0.1.0",
                "timestamp", Instant.now().toString()));
    }
}
