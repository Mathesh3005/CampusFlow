package com.campusflow.security;

import com.campusflow.entity.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

public record
CustomUserPrincipal(Long id, String email, String password, String role, boolean active)
        implements UserDetails {
    public static CustomUserPrincipal from(User user) {
        return new CustomUserPrincipal(user.getId(), user.getEmail(), user.getPasswordHash(),
                user.getRole().name(), Boolean.TRUE.equals(user.getIsActive()));
    }

    @Override public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role));
    }
    @Override public String getUsername() { return email; }
    @Override public String getPassword() { return password; }
    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return active; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return active; }
}
