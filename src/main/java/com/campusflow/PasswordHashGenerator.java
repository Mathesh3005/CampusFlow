package com.campusflow;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class PasswordHashGenerator {

    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String password = "CampusAdmin@2026";

        String hash = encoder.encode(password);

        System.out.println("Password Hash:");
        System.out.println(hash);

        System.out.println("Verification:");
        System.out.println(encoder.matches(password, hash));
    }
}