package com.methaltech.sacco.security;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class TokenGenerator {

    private final SecureRandom secureRandom = new SecureRandom();

    public String createToken() {
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        return UUID.randomUUID() + "." + Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }
}
