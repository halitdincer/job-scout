package com.jobscout.security;

import com.jobscout.domain.User;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public class JobScoutUserDetails implements UserDetails {

    private final User user;

    public JobScoutUserDetails(User user) {
        this.user = user;
    }

    public User user() {
        return user;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        List<GrantedAuthority> authorities = new ArrayList<>();
        if (user.isStaff()) {
            authorities.add(new SimpleGrantedAuthority("ROLE_STAFF"));
        }
        if (user.isSuperuser()) {
            authorities.add(new SimpleGrantedAuthority("ROLE_SUPERUSER"));
        }
        return authorities;
    }

    @Override
    public String getPassword() {
        return user.getPassword();
    }

    @Override
    public String getUsername() {
        return user.getUsername();
    }

    @Override
    public boolean isEnabled() {
        return user.isActive();
    }
}
