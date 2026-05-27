package com.jobscout.api;

import com.jobscout.api.generated.api.AuthApi;
import com.jobscout.api.generated.model.CurrentUser;
import com.jobscout.api.generated.model.LoginRequest;
import com.jobscout.domain.User;
import com.jobscout.security.CurrentUserService;
import com.jobscout.security.JobScoutUserDetails;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1")
class AuthController implements AuthApi {

    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final CurrentUserService currentUser;
    private final SecurityContextLogoutHandler logoutHandler = new SecurityContextLogoutHandler();

    AuthController(AuthenticationManager authenticationManager,
                   SecurityContextRepository securityContextRepository,
                   CurrentUserService currentUser) {
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
        this.currentUser = currentUser;
    }

    @Override
    public ResponseEntity<CurrentUser> login(LoginRequest loginRequest) {
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(
                    loginRequest.getUsername(),
                    loginRequest.getPassword()));
        } catch (BadCredentialsException e) {
            throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "Invalid username or password");
        }

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        ServletRequestAttributes attributes = currentRequestAttributes();
        securityContextRepository.saveContext(
            context, attributes.getRequest(), attributes.getResponse());

        return ResponseEntity.ok(toDto(userFrom(authentication)));
    }

    @Override
    public ResponseEntity<Void> logout() {
        ServletRequestAttributes attributes = currentRequestAttributes();
        HttpServletRequest request = attributes.getRequest();
        HttpServletResponse response = attributes.getResponse();
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        logoutHandler.logout(request, response, authentication);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<CurrentUser> getCurrentUser() {
        return ResponseEntity.ok(toDto(currentUser.current()));
    }

    private static ServletRequestAttributes currentRequestAttributes() {
        ServletRequestAttributes attributes =
            (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null || attributes.getResponse() == null) {
            throw new IllegalStateException("No current servlet request");
        }
        return attributes;
    }

    private static User userFrom(Authentication authentication) {
        Object principal = authentication.getPrincipal();
        if (principal instanceof JobScoutUserDetails details) {
            return details.user();
        }
        throw new IllegalStateException("Unexpected authentication principal");
    }

    private static CurrentUser toDto(User user) {
        return new CurrentUser(
                user.getId(),
                user.getUsername(),
                user.isStaff(),
                user.isSuperuser())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .email(user.getEmail());
    }
}
