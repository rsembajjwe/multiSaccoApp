package com.methaltech.sacco.identity;

import java.util.Optional;
import org.springframework.stereotype.Service;

/**
 * Read-only directory lookups for resolving a user's display name outside the identity package
 * (for example when the chat module renders message authors). Exposed as a service so the
 * package-private {@link UserRepository} is not leaked to other modules.
 */
@Service
public class UserDirectoryService {

    private final UserRepository userRepository;

    UserDirectoryService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Optional<String> displayName(String userId) {
        if (userId == null || userId.isBlank()) return Optional.empty();
        return userRepository.findById(userId).map(User::getFullName);
    }
}
