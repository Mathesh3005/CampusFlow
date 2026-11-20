package com.campusflow.dev;

import com.campusflow.dto.auth.LoginRequest;
import com.campusflow.entity.Role;
import com.campusflow.entity.User;
import com.campusflow.repository.UserRepository;
import jakarta.validation.Validator;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.Locale;

@Component
@Profile("local & !prod & !production & !default")
public class LocalAdminProvisioningRunner implements ApplicationRunner {
    static final String ENABLE_PROPERTY = "CAMPUSFLOW_CREATE_TEST_ADMIN";
    private static final String EMAIL_PROPERTY = "CAMPUSFLOW_ADMIN_EMAIL";
    private static final String PASSWORD_PROPERTY = "CAMPUSFLOW_ADMIN_PASSWORD";

    private final Environment environment;
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final Validator validator;
    private final TransactionTemplate transactions;

    public LocalAdminProvisioningRunner(
            Environment environment,
            UserRepository users,
            PasswordEncoder passwords,
            Validator validator,
            PlatformTransactionManager transactionManager) {
        this.environment = environment;
        this.users = users;
        this.passwords = passwords;
        this.validator = validator;
        this.transactions = new TransactionTemplate(transactionManager);
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!Boolean.parseBoolean(environment.getProperty(ENABLE_PROPERTY, "false"))) {
            return;
        }

        String email = required(EMAIL_PROPERTY).trim().toLowerCase(Locale.ROOT);
        String rawPassword = required(PASSWORD_PROPERTY);
        if (!validator.validate(new LoginRequest(email, rawPassword)).isEmpty()) {
            throw new IllegalStateException("Local admin email or password does not meet login constraints");
        }

        transactions.executeWithoutResult(status -> {
            if (users.existsByEmail(email)) {
                throw new IllegalStateException("A user with CAMPUSFLOW_ADMIN_EMAIL already exists");
            }
            User admin = new User(email, passwords.encode(rawPassword), Role.ADMIN);
            admin.setIsActive(true);
            users.save(admin);
        });
    }

    private String required(String propertyName) {
        String value = environment.getProperty(propertyName);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Missing required local admin setting: " + propertyName);
        }
        return value;
    }
}
