package com.jobscout.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.jobscout.domain.User;
import com.jobscout.repository.UserRepository;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;

class CurrentUserServiceTest {

    private final UserRepository users = org.mockito.Mockito.mock(UserRepository.class);
    private final CurrentUserService service = new CurrentUserService(users);

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void returnsUserFromJobScoutPrincipal() {
        User user = user("e2e");
        SecurityContextHolder.getContext().setAuthentication(
            new TestingAuthenticationToken(new JobScoutUserDetails(user), "n/a", "ROLE_USER"));

        assertThat(service.current()).isSameAs(user);
    }

    @Test
    void fallsBackToUsernameLookupForOtherPrincipals() {
        User user = user("e2e");
        when(users.findByUsername("e2e")).thenReturn(Optional.of(user));
        SecurityContextHolder.getContext().setAuthentication(
            new TestingAuthenticationToken("e2e", "n/a", "ROLE_USER"));

        assertThat(service.current()).isSameAs(user);
    }

    @Test
    void rejectsAnonymousOrMissingAuthentication() {
        assertThatThrownBy(service::current)
            .isInstanceOf(AuthenticationCredentialsNotFoundException.class);

        SecurityContextHolder.getContext().setAuthentication(
            new AnonymousAuthenticationToken("key", "anonymousUser",
                AuthorityUtils.createAuthorityList("ROLE_ANONYMOUS")));

        assertThatThrownBy(service::current)
            .isInstanceOf(AuthenticationCredentialsNotFoundException.class);
    }

    @Test
    void rejectsUnknownUsernamePrincipal() {
        when(users.findByUsername("missing")).thenReturn(Optional.empty());
        SecurityContextHolder.getContext().setAuthentication(
            new TestingAuthenticationToken("missing", "n/a", "ROLE_USER"));

        assertThatThrownBy(service::current)
            .isInstanceOf(UsernameNotFoundException.class);
    }

    private static User user(String username) {
        User user = new User();
        user.setId(1L);
        user.setUsername(username);
        user.setPassword("!");
        user.setActive(true);
        user.setDateJoined(Instant.EPOCH);
        return user;
    }
}
