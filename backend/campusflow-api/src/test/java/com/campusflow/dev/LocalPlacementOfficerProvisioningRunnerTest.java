package com.campusflow.dev;

import com.campusflow.entity.PlacementOfficer;
import com.campusflow.entity.Role;
import com.campusflow.entity.User;
import com.campusflow.repository.PlacementOfficerRepository;
import com.campusflow.repository.UserRepository;
import com.campusflow.service.PlacementOfficerService;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.boot.ApplicationArguments;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.core.env.Environment;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class LocalPlacementOfficerProvisioningRunnerTest {
    private static final ValidatorFactory VALIDATOR_FACTORY = Validation.buildDefaultValidatorFactory();
    private static final Validator VALIDATOR = VALIDATOR_FACTORY.getValidator();
    private static final String EMAIL = "officer@example.test";
    private static final String PASSWORD = "local-test-password";
    private static final String EMPLOYEE_ID = "LOCAL-OFFICER-1";
    private static final String FULL_NAME = "Local Test Officer";
    private static final String DEPARTMENT = "Career Services";
    private static final ApplicationArguments NO_ARGUMENTS = mock(ApplicationArguments.class);

    @AfterAll
    static void closeValidatorFactory() {
        VALIDATOR_FACTORY.close();
    }

    @Test
    void provisionsEncodedActiveOfficerAndLinkedProfileTransactionally() {
        TestDependencies dependencies = dependencies();
        MockEnvironment environment = enabledEnvironment();
        when(dependencies.userRepository.existsByEmail(EMAIL)).thenReturn(false);
        when(dependencies.placementOfficerRepository.existsByEmployeeId(EMPLOYEE_ID)).thenReturn(false);
        when(dependencies.passwordEncoder.encode(PASSWORD)).thenReturn("bcrypt-encoded-password");
        when(dependencies.userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            setId(user, 41L);
            return user;
        });

        runner(environment, dependencies).run(NO_ARGUMENTS);

        var savedUserCaptor = org.mockito.ArgumentCaptor.forClass(User.class);
        var officerCaptor = org.mockito.ArgumentCaptor.forClass(PlacementOfficer.class);
        verify(dependencies.userRepository).save(savedUserCaptor.capture());
        verify(dependencies.placementOfficerService).createPlacementOfficer(officerCaptor.capture());

        User savedUser = savedUserCaptor.getValue();
        assertEquals(EMAIL, savedUser.getEmail());
        assertEquals("bcrypt-encoded-password", savedUser.getPasswordHash());
        assertNotEquals(PASSWORD, savedUser.getPasswordHash());
        verify(dependencies.passwordEncoder).encode(PASSWORD);
        assertEquals(Role.PLACEMENT_OFFICER, savedUser.getRole());
        assertTrue(savedUser.getIsActive());

        PlacementOfficer officer = officerCaptor.getValue();
        assertSame(savedUser, officer.getUser());
        assertEquals(EMPLOYEE_ID, officer.getEmployeeId());
        assertEquals(FULL_NAME, officer.getFullName());
        assertEquals(DEPARTMENT, officer.getDepartment());

        var order = inOrder(dependencies.userRepository, dependencies.placementOfficerService);
        order.verify(dependencies.userRepository).save(any(User.class));
        order.verify(dependencies.placementOfficerService).createPlacementOfficer(any(PlacementOfficer.class));
        verify(dependencies.transactionManager).commit(dependencies.transactionStatus);
        verify(dependencies.transactionManager, never()).rollback(any());
    }

    @Test
    void duplicateEmailFailsWithoutWritingAndRollsBack() {
        TestDependencies dependencies = dependencies();
        when(dependencies.userRepository.existsByEmail(EMAIL)).thenReturn(true);

        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> runner(enabledEnvironment(), dependencies).run(NO_ARGUMENTS));

        assertEquals("A user with CAMPUSFLOW_OFFICER_EMAIL already exists", error.getMessage());
        verify(dependencies.userRepository, never()).save(any());
        verifyNoInteractions(dependencies.placementOfficerService, dependencies.passwordEncoder);
        verify(dependencies.transactionManager).rollback(dependencies.transactionStatus);
    }

    @Test
    void duplicateEmployeeIdFailsWithoutWritingAndRollsBack() {
        TestDependencies dependencies = dependencies();
        when(dependencies.userRepository.existsByEmail(EMAIL)).thenReturn(false);
        when(dependencies.placementOfficerRepository.existsByEmployeeId(EMPLOYEE_ID)).thenReturn(true);

        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> runner(enabledEnvironment(), dependencies).run(NO_ARGUMENTS));

        assertEquals("A profile with CAMPUSFLOW_OFFICER_EMPLOYEE_ID already exists", error.getMessage());
        verify(dependencies.userRepository, never()).save(any());
        verifyNoInteractions(dependencies.placementOfficerService, dependencies.passwordEncoder);
        verify(dependencies.transactionManager).rollback(dependencies.transactionStatus);
    }

    @Test
    void missingEnvironmentValuesFailBeforeOpeningTransaction() {
        List<String> requiredProperties = List.of(
                "CAMPUSFLOW_OFFICER_EMAIL",
                "CAMPUSFLOW_OFFICER_PASSWORD",
                "CAMPUSFLOW_OFFICER_EMPLOYEE_ID",
                "CAMPUSFLOW_OFFICER_FULL_NAME",
                "CAMPUSFLOW_OFFICER_DEPARTMENT");

        for (String missingProperty : requiredProperties) {
            TestDependencies dependencies = dependencies();
            IllegalStateException error = assertThrows(IllegalStateException.class,
                    () -> runner(environmentWithout(missingProperty), dependencies).run(NO_ARGUMENTS));

            assertTrue(error.getMessage().contains(missingProperty));
            verifyNoInteractions(dependencies.userRepository, dependencies.placementOfficerRepository,
                    dependencies.placementOfficerService, dependencies.passwordEncoder,
                    dependencies.transactionManager);
        }
    }

    @Test
    void disabledProvisioningDoesNothingEvenWhenRequiredValuesAreMissing() {
        for (MockEnvironment environment : List.of(
                new MockEnvironment(),
                new MockEnvironment().withProperty(LocalPlacementOfficerProvisioningRunner.ENABLE_PROPERTY, "false"))) {
            TestDependencies dependencies = dependencies();
            runner(environment, dependencies).run(NO_ARGUMENTS);

            verifyNoInteractions(dependencies.userRepository, dependencies.placementOfficerRepository,
                    dependencies.placementOfficerService, dependencies.passwordEncoder,
                    dependencies.transactionManager);
        }
    }

    @Test
    void runnerIsRegisteredOnlyForLocalAndNeverWithDefaultOrProductionProfiles() {
        assertRunnerPresence(false);
        assertRunnerPresence(false, "default");
        assertRunnerPresence(false, "production");
        assertRunnerPresence(false, "prod");
        assertRunnerPresence(false, "local", "prod");
        assertRunnerPresence(false, "local", "production");
        assertRunnerPresence(false, "local", "default");
        assertRunnerPresence(true, "local");
    }

    private static void assertRunnerPresence(boolean expected, String... profiles) {
        try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext()) {
            context.getEnvironment().setActiveProfiles(profiles);
            context.registerBean(UserRepository.class, () -> mock(UserRepository.class));
            context.registerBean(PlacementOfficerRepository.class, () -> mock(PlacementOfficerRepository.class));
            context.registerBean(PlacementOfficerService.class, () -> mock(PlacementOfficerService.class));
            context.registerBean(PasswordEncoder.class, () -> mock(PasswordEncoder.class));
            context.registerBean(Validator.class, () -> VALIDATOR);
            context.registerBean(PlatformTransactionManager.class, () -> mock(PlatformTransactionManager.class));
            context.register(LocalPlacementOfficerProvisioningRunner.class);
            context.refresh();

            assertEquals(expected, context.getBeansOfType(LocalPlacementOfficerProvisioningRunner.class).size() == 1);
        }
    }

    private static LocalPlacementOfficerProvisioningRunner runner(
            Environment environment, TestDependencies dependencies) {
        return new LocalPlacementOfficerProvisioningRunner(environment, dependencies.userRepository,
                dependencies.placementOfficerRepository, dependencies.placementOfficerService,
                dependencies.passwordEncoder, VALIDATOR, dependencies.transactionManager);
    }

    private static TestDependencies dependencies() {
        UserRepository userRepository = mock(UserRepository.class);
        PlacementOfficerRepository placementOfficerRepository = mock(PlacementOfficerRepository.class);
        PlacementOfficerService placementOfficerService = mock(PlacementOfficerService.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        PlatformTransactionManager transactionManager = mock(PlatformTransactionManager.class);
        TransactionStatus transactionStatus = new SimpleTransactionStatus();
        when(transactionManager.getTransaction(any())).thenReturn(transactionStatus);
        return new TestDependencies(userRepository, placementOfficerRepository, placementOfficerService,
                passwordEncoder, transactionManager, transactionStatus);
    }

    private static MockEnvironment enabledEnvironment() {
        return environmentWithout(null);
    }

    private static MockEnvironment environmentWithout(String omittedProperty) {
        MockEnvironment environment = new MockEnvironment()
                .withProperty(LocalPlacementOfficerProvisioningRunner.ENABLE_PROPERTY, "true");
        Map<String, String> values = Map.of(
                "CAMPUSFLOW_OFFICER_EMAIL", EMAIL,
                "CAMPUSFLOW_OFFICER_PASSWORD", PASSWORD,
                "CAMPUSFLOW_OFFICER_EMPLOYEE_ID", EMPLOYEE_ID,
                "CAMPUSFLOW_OFFICER_FULL_NAME", FULL_NAME,
                "CAMPUSFLOW_OFFICER_DEPARTMENT", DEPARTMENT);
        values.forEach((key, value) -> {
            if (!key.equals(omittedProperty)) {
                environment.setProperty(key, value);
            }
        });
        return environment;
    }

    private static void setId(User user, Long id) {
        try {
            Field field = User.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(user, id);
        } catch (ReflectiveOperationException exception) {
            throw new AssertionError(exception);
        }
    }

    private record TestDependencies(
            UserRepository userRepository,
            PlacementOfficerRepository placementOfficerRepository,
            PlacementOfficerService placementOfficerService,
            PasswordEncoder passwordEncoder,
            PlatformTransactionManager transactionManager,
            TransactionStatus transactionStatus) {
    }
}
