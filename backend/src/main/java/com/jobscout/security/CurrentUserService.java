package com.jobscout.security;

import com.jobscout.domain.User;
import com.jobscout.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

/**
 * Resolves the {@link User} for the current request.
 */
@Service
public class CurrentUserService {

    private final UserRepository users;

    public CurrentUserService(UserRepository users) {
        this.users = users;
    }

    public User current() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
            || !authentication.isAuthenticated()
            || authentication instanceof AnonymousAuthenticationToken) {
            throw new AuthenticationCredentialsNotFoundException("Authentication required");
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof JobScoutUserDetails details) {
            return details.user();
        }

        String username = authentication.getName();
        return users.findByUsername(username)
            .orElseThrow(() -> new UsernameNotFoundException("Unknown user: " + username));
    }
}
