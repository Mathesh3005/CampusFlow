package com.campusflow.dev;

import com.campusflow.dto.auth.LoginRequest;
import com.campusflow.entity.PlacementOfficer;
import com.campusflow.entity.Role;
import com.campusflow.entity.User;
import com.campusflow.repository.PlacementOfficerRepository;
import com.campusflow.repository.UserRepository;
import com.campusflow.service.PlacementOfficerService;
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
public class LocalPlacementOfficerProvisioningRunner implements ApplicationRunner {
    static final String ENABLE_PROPERTY = "CAMPUSFLOW_CREATE_TEST_OFFICER";
    private static final String EMAIL_PROPERTY = "CAMPUSFLOW_OFFICER_EMAIL";
    private static final String PASSWORD_PROPERTY = "CAMPUSFLOW_OFFICER_PASSWORD";
    private static final String EMPLOYEE_ID_PROPERTY = "CAMPUSFLOW_OFFICER_EMPLOYEE_ID";
    private static final String FULL_NAME_PROPERTY = "CAMPUSFLOW_OFFICER_FULL_NAME";
    private static final String DEPARTMENT_PROPERTY = "CAMPUSFLOW_OFFICER_DEPARTMENT";

    private final Environment environment;
    private final UserRepository userRepository;
    private final PlacementOfficerRepository placementOfficerRepository;
    private final PlacementOfficerService placementOfficerService;
    private final PasswordEncoder passwordEncoder;
    private final Validator validator;
    private final TransactionTemplate transactionTemplate;

    public LocalPlacementOfficerProvisioningRunner(
            Environment environment,
            UserRepository userRepository,
            PlacementOfficerRepository placementOfficerRepository,
            PlacementOfficerService placementOfficerService,
            PasswordEncoder passwordEncoder,
            Validator validator,
            PlatformTransactionManager transactionManager) {
        this.environment = environment;
        this.userRepository = userRepository;
        this.placementOfficerRepository = placementOfficerRepository;
        this.placementOfficerService = placementOfficerService;
        this.passwordEncoder = passwordEncoder;
        this.validator = validator;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!Boolean.parseBoolean(environment.getProperty(ENABLE_PROPERTY, "false"))) {
            return;
        }

        String email = requiredValue(EMAIL_PROPERTY).trim().toLowerCase(Locale.ROOT);
        String rawPassword = requiredValue(PASSWORD_PROPERTY);
        String employeeId = requiredValue(EMPLOYEE_ID_PROPERTY).trim();
        String fullName = requiredValue(FULL_NAME_PROPERTY).trim();
        String department = requiredValue(DEPARTMENT_PROPERTY).trim();

        if (!validator.validate(new LoginRequest(email, rawPassword)).isEmpty()) {
            throw new IllegalStateException("Local officer email or password does not meet login constraints");
        }
        validateLength(EMPLOYEE_ID_PROPERTY, employeeId, 30);
        validateLength(FULL_NAME_PROPERTY, fullName, 150);
        validateLength(DEPARTMENT_PROPERTY, department, 100);

        transactionTemplate.executeWithoutResult(status -> provision(
                email, rawPassword, employeeId, fullName, department));
    }

    private void provision(String email, String rawPassword, String employeeId, String fullName, String department) {
        if (userRepository.existsByEmail(email)) {
            throw new IllegalStateException("A user with CAMPUSFLOW_OFFICER_EMAIL already exists");
        }
        if (placementOfficerRepository.existsByEmployeeId(employeeId)) {
            throw new IllegalStateException("A profile with CAMPUSFLOW_OFFICER_EMPLOYEE_ID already exists");
        }

        User user = new User(email, passwordEncoder.encode(rawPassword), Role.PLACEMENT_OFFICER);
        user.setIsActive(true);
        User savedUser = userRepository.save(user);

        PlacementOfficer officer = new PlacementOfficer(savedUser, employeeId, fullName);
        officer.setDepartment(department);
        placementOfficerService.createPlacementOfficer(officer);
    }

    private String requiredValue(String propertyName) {
        String value = environment.getProperty(propertyName);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Missing required local officer setting: " + propertyName);
        }
        return value;
    }

    private static void validateLength(String propertyName, String value, int maximumLength) {
        if (value.length() > maximumLength) {
            throw new IllegalStateException(propertyName + " exceeds the maximum length of " + maximumLength);
        }
    }
}
