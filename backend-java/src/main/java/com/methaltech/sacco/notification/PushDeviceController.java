package com.methaltech.sacco.notification;

import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.member.MemberAuthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
class PushDeviceController {
    private final AuthService authService;
    private final MemberAuthService memberAuthService;
    private final PushDeviceRegistrationService registrations;

    PushDeviceController(AuthService authService, MemberAuthService memberAuthService,
            PushDeviceRegistrationService registrations) {
        this.authService = authService;
        this.memberAuthService = memberAuthService;
        this.registrations = registrations;
    }

    @PostMapping("/api/v1/member-auth/push-devices")
    ResponseEntity<?> registerMember(@RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody DeviceRequest body) {
        var session = memberAuthService.currentSession(authorization);
        if (session == null) return memberAuthService.authRequired();
        registrations.register(session.member().getTenantId(), "member", session.member().getId(),
                body.token().trim(), body.platform());
        return ResponseEntity.ok(ApiResponse.of(new DeviceResponse("registered")));
    }

    @DeleteMapping("/api/v1/member-auth/push-devices")
    ResponseEntity<?> unregisterMember(@RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody DeviceRequest body) {
        var session = memberAuthService.currentSession(authorization);
        if (session == null) return memberAuthService.authRequired();
        registrations.unregister("member", session.member().getId(), body.token().trim());
        return ResponseEntity.ok(ApiResponse.of(new DeviceResponse("unregistered")));
    }

    @PostMapping("/api/v1/auth/push-devices")
    ResponseEntity<?> registerStaff(@RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody DeviceRequest body) {
        var session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        registrations.register(session.user().getTenantId(), "staff", session.user().getId(),
                body.token().trim(), body.platform());
        return ResponseEntity.ok(ApiResponse.of(new DeviceResponse("registered")));
    }

    @DeleteMapping("/api/v1/auth/push-devices")
    ResponseEntity<?> unregisterStaff(@RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody DeviceRequest body) {
        var session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        registrations.unregister("staff", session.user().getId(), body.token().trim());
        return ResponseEntity.ok(ApiResponse.of(new DeviceResponse("unregistered")));
    }

    record DeviceRequest(
            @NotBlank @Size(max = 512) String token,
            @NotBlank @Pattern(regexp = "android|ios") String platform) {
    }

    record DeviceResponse(String status) {
    }
}
