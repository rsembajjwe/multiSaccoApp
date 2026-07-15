package com.methaltech.sacco.identity;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.security.PasswordHasher;
import com.methaltech.sacco.security.TokenGenerator;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
class AuthController {

    private final UserRepository userRepository;
    private final PasswordHasher passwordHasher;
    private final TokenGenerator tokenGenerator;

    AuthController(UserRepository userRepository, PasswordHasher passwordHasher, TokenGenerator tokenGenerator) {
        this.userRepository = userRepository;
        this.passwordHasher = passwordHasher;
        this.tokenGenerator = tokenGenerator;
    }

    @PostMapping("/login")
    ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        User user = userRepository.findByEmailIgnoreCase(request.email().trim())
                .filter(candidate -> "active".equals(candidate.getStatus()))
                .filter(candidate -> passwordHasher.matches(request.password(), candidate.getPasswordSalt(), candidate.getPasswordHash()))
                .orElse(null);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiErrorResponse.of(401, "AUTH_INVALID", "Invalid email or password."));
        }

        return ResponseEntity.ok(ApiResponse.of(new LoginResponse(
                tokenGenerator.createToken(),
                "Bearer",
                UserResponse.from(user))));
    }

    record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {
    }

    record LoginResponse(String token, String tokenType, UserResponse user) {
    }
}
