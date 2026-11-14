package com.campusflow.security;

import com.campusflow.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {
    private final UserRepository users;
    public UserDetailsServiceImpl(UserRepository users) { this.users = users; }

    @Override public UserDetails loadUserByUsername(String username) {
        if (username == null) throw new UsernameNotFoundException("Invalid credentials");
        return users.findByEmail(username.trim().toLowerCase(Locale.ROOT))
                .map(CustomUserPrincipal::from)
                .orElseThrow(() -> new UsernameNotFoundException("Invalid credentials"));
    }
}
