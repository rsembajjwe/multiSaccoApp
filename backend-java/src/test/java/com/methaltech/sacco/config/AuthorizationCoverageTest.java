package com.methaltech.sacco.config;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

/**
 * Build-time guarantee for the default-deny hardening: every controller request handler must either
 * resolve/authorise a session (staff or member) or appear on the explicit public allowlist. A new
 * endpoint that forgets its authorisation check fails this test instead of shipping reachable
 * anonymously. Keep {@link #PUBLIC_ENDPOINTS} in sync with {@code AuthenticationGuardFilter}.
 */
class AuthorizationCoverageTest {

    private static final Path CONTROLLER_ROOT = Path.of("src/main/java/com/methaltech/sacco");

    private static final Pattern CLASS_MAPPING = Pattern.compile("@RequestMapping\\(\"([^\"]+)\"\\)");
    private static final Pattern HANDLER = Pattern.compile("@(Get|Post|Put|Patch|Delete)Mapping(?:\\(([^)]*)\\))?");
    private static final Pattern FIRST_STRING = Pattern.compile("\"([^\"]*)\"");

    private static final List<String> GUARD_TOKENS = List.of(
            "currentSession(", "requirePlatform(", "hasPermission(", "currentUser(");

    private static final Set<String> PUBLIC_ENDPOINTS = Set.of(
            "GET /api/v1/health",
            "POST /api/v1/auth/login",
            "POST /api/v1/auth/first-login-password",
            "POST /api/v1/auth/mfa/verify",
            "POST /api/v1/auth/password-reset/request",
            "POST /api/v1/auth/password-reset/confirm",
            "POST /api/v1/member-auth/login",
            "POST /api/v1/member-auth/password-reset/request",
            "POST /api/v1/member-auth/password-reset/confirm",
            "POST /api/v1/integrations/mobile-money/callback",
            "POST /api/v1/integrations/mobile-money/subscription-callback",
            "POST /api/v1/public/sacco-registrations");

    @Test
    void everyControllerHandlerIsGuardedOrExplicitlyPublic() throws IOException {
        List<String> violations = new ArrayList<>();
        try (Stream<Path> files = Files.walk(CONTROLLER_ROOT)) {
            List<Path> controllers = files
                    .filter(path -> path.getFileName().toString().endsWith("Controller.java"))
                    .toList();
            for (Path controller : controllers) {
                inspect(controller, violations);
            }
        }
        assertTrue(violations.isEmpty(),
                "Unguarded controller handlers found. Add an authorisation check (currentSession/"
                        + "hasPermission/requirePlatform), or, if the endpoint is intentionally public, add it to "
                        + "the allowlist in BOTH this test and AuthenticationGuardFilter:\n  "
                        + String.join("\n  ", violations));
    }

    private void inspect(Path controller, List<String> violations) throws IOException {
        String src = Files.readString(controller);
        Matcher classMapping = CLASS_MAPPING.matcher(src);
        String prefix = classMapping.find() ? classMapping.group(1) : "";
        Matcher handler = HANDLER.matcher(src);
        while (handler.find()) {
            String verb = handler.group(1).toUpperCase();
            String path = "";
            if (handler.group(2) != null) {
                Matcher firstString = FIRST_STRING.matcher(handler.group(2));
                if (firstString.find()) {
                    path = firstString.group(1);
                }
            }
            String route = path.startsWith("/api/v1") ? path : prefix + path;
            String body = methodBody(src, handler.end());
            boolean guarded = GUARD_TOKENS.stream().anyMatch(body::contains);
            String key = verb + " " + route;
            if (!guarded && !isPublic(route, key)) {
                violations.add(key + "   (" + controller.getFileName() + ")");
            }
        }
    }

    private boolean isPublic(String route, String key) {
        return route.startsWith("/api/v1/public/") || PUBLIC_ENDPOINTS.contains(key);
    }

    private String methodBody(String src, int from) {
        int depth = 0;
        boolean started = false;
        StringBuilder builder = new StringBuilder();
        for (int i = from; i < src.length(); i++) {
            char c = src.charAt(i);
            builder.append(c);
            if (c == '{') {
                depth++;
                started = true;
            } else if (c == '}') {
                depth--;
                if (started && depth == 0) {
                    break;
                }
            }
        }
        return builder.toString();
    }
}
