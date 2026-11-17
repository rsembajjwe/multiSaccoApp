package com.methaltech.sacco.health;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import java.util.Locale;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
class MobileAppPolicyController {

    private final Environment environment;

    MobileAppPolicyController(Environment environment) {
        this.environment = environment;
    }

    @GetMapping("/mobile-app-policy")
    ResponseEntity<?> policy(
            @RequestParam String app,
            @RequestParam String platform,
            @RequestParam int versionCode) {
        String normalizedApp = app == null ? "" : app.trim().toLowerCase(Locale.ROOT);
        String normalizedPlatform = platform == null ? "" : platform.trim().toLowerCase(Locale.ROOT);
        if (!normalizedApp.matches("member|staff|proprietor")) {
            return ResponseEntity.badRequest().body(ApiErrorResponse.of(
                    HttpStatus.BAD_REQUEST.value(),
                    "INVALID_MOBILE_APP",
                    "App must be member, staff, or proprietor."));
        }
        if (!normalizedPlatform.matches("android|ios") || versionCode < 1) {
            return ResponseEntity.badRequest().body(ApiErrorResponse.of(
                    HttpStatus.BAD_REQUEST.value(),
                    "INVALID_APP_VERSION",
                    "Platform must be android or ios and versionCode must be positive."));
        }

        String prefix = "sacco.mobile-app." + normalizedApp + "." + normalizedPlatform;
        int minimumVersionCode = positiveInt(prefix + ".minimum-version-code", versionCode);
        int latestVersionCode = Math.max(
                minimumVersionCode,
                positiveInt(prefix + ".latest-version-code", minimumVersionCode));
        boolean upgradeRequired = versionCode < minimumVersionCode;
        boolean updateAvailable = versionCode < latestVersionCode;
        String updateUrl = environment.getProperty(prefix + ".update-url", "").trim();
        String message = environment.getProperty(
                prefix + ".message",
                upgradeRequired
                        ? "This app version is no longer supported. Install the latest approved release."
                        : "A newer approved app version is available.").trim();

        return ResponseEntity.ok(ApiResponse.of(new MobileAppPolicyResponse(
                normalizedApp,
                normalizedPlatform,
                versionCode,
                minimumVersionCode,
                latestVersionCode,
                upgradeRequired,
                updateAvailable,
                updateUrl,
                message)));
    }

    private int positiveInt(String property, int fallback) {
        Integer configured = environment.getProperty(property, Integer.class);
        return configured == null || configured < 1 ? fallback : configured;
    }

    record MobileAppPolicyResponse(
            String app,
            String platform,
            int currentVersionCode,
            int minimumVersionCode,
            int latestVersionCode,
            boolean upgradeRequired,
            boolean updateAvailable,
            String updateUrl,
            String message) {
    }
}
