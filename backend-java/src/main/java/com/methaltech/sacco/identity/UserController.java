package com.methaltech.sacco.identity;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.security.PasswordHasher;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
class UserController {

    private final UserRepository userRepository;
    private final AuthService authService;
    private final PasswordHasher passwordHasher;

    UserController(UserRepository userRepository, AuthService authService, PasswordHasher passwordHasher) {
        this.userRepository = userRepository;
        this.authService = authService;
        this.passwordHasher = passwordHasher;
    }

    @GetMapping
    ResponseEntity<?> listUsers(@RequestHeader(name = "Authorization", required = false) String authorization) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        List<User> users = authService.isPlatform(currentSession.user())
                ? userRepository.findAllByOrderByFullNameAsc()
                : userRepository.findByTenantIdOrderByFullNameAsc(currentSession.user().getTenantId());

        return ResponseEntity.ok(ApiResponse.of(users.stream().map(UserResponse::from).toList()));
    }

    @PostMapping
    ResponseEntity<?> createUser(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody CreateUserRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String tenantId = request.tenantId() == null || request.tenantId().isBlank()
                ? currentSession.user().getTenantId()
                : request.tenantId().trim();

        if (!authService.isPlatform(currentSession.user()) && !tenantId.equals(currentSession.user().getTenantId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot create a user in another tenant."));
        }

        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByTenantIdAndEmailIgnoreCase(tenantId, email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "USER_EXISTS", "A user with that email already exists in this tenant."));
        }

        PasswordHasher.PasswordHash password = passwordHasher.hash(request.password());
        User user = new User(
                "user_" + UUID.randomUUID(),
                tenantId,
                request.fullName().trim(),
                email,
                request.phone() == null ? "" : request.phone().trim(),
                password.hash(),
                password.salt(),
                "active");

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(UserResponse.from(userRepository.save(user))));
    }

    record CreateUserRequest(
            String tenantId,
            @NotBlank String fullName,
            @Email @NotBlank String email,
            String phone,
            @NotBlank String password) {
    }
}
