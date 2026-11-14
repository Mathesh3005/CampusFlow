package com.campusflow;

import com.campusflow.dto.auth.AuthResponse;
import com.campusflow.dto.auth.RegisterStudentRequest;
import com.campusflow.dto.resume.ResumeResponseDto;
import com.campusflow.entity.Resume;
import com.campusflow.entity.Student;
import com.campusflow.entity.User;
import com.campusflow.entity.NotificationType;
import com.campusflow.service.NotificationService;
import com.campusflow.dto.job.JobResponseDto;
import com.campusflow.entity.EmploymentType;
import com.campusflow.entity.WorkMode;
import org.springframework.dao.DataIntegrityViolationException;
import com.campusflow.repository.ResumeRepository;
import com.campusflow.repository.StudentRepository;
import com.campusflow.repository.UserRepository;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
@ActiveProfiles("integration")
@Testcontainers
class CampusflowApiApplicationTests {
    private static final String POSTGRES_IMAGE = "postgres:18.6-alpine";
    private static final Path RESUME_STORAGE = Path.of(System.getProperty("java.io.tmpdir"),
            "campusflow-it-" + UUID.randomUUID());

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(POSTGRES_IMAGE)
            .withDatabaseName("campusflow_it")
            .withUsername("campusflow_test")
            .withPassword("campusflow_test_only");

    @DynamicPropertySource
    static void isolatedContainerProperties(DynamicPropertyRegistry properties) {
        if (POSTGRES.getJdbcUrl().contains("localhost:5432/campusflow_db")) {
            throw new IllegalStateException("Integration tests must never use the development database");
        }
        properties.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        properties.add("spring.datasource.username", POSTGRES::getUsername);
        properties.add("spring.datasource.password", POSTGRES::getPassword);
        properties.add("spring.datasource.driver-class-name", POSTGRES::getDriverClassName);
        properties.add("app.file.storage-location", () -> RESUME_STORAGE.toString());
    }

    @Autowired TestRestTemplate http;
    @Autowired JdbcTemplate jdbc;
    @Autowired Flyway flyway;
    @Autowired UserRepository users;
    @Autowired StudentRepository students;
    @Autowired ResumeRepository resumes;
    @Autowired NotificationService notificationService;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtEncoder jwtEncoder;
    @org.springframework.boot.test.web.server.LocalServerPort int port;

    @Test
    void contextStartsAgainstDisposablePostgresAndAppliesOnlyV1() {
        assertTrue(POSTGRES.isRunning(), "PostgreSQL Testcontainer must be running");
        assertFalse(POSTGRES.getJdbcUrl().contains("localhost:5432/campusflow_db"));
        var applied = flyway.info().applied();
        assertEquals(1, applied.length, "The fresh test database should have exactly one applied migration");
        assertEquals(MigrationVersion.fromVersion("1"), applied[0].getVersion());
        assertEquals("campusflow_it", jdbc.queryForObject("SELECT current_database()", String.class));
    }

    @Test
    void studentAuthAndResumeLifecycleRunsEndToEnd() throws Exception {
        String suffix = UUID.randomUUID().toString();
        String shortSuffix = suffix.replace("-", "").substring(0, 12);
        AuthResponse studentA = registerStudent("a-" + suffix + "@example.test", "REG-A-" + shortSuffix, "Student A");
        assertEquals("STUDENT", studentA.role());

        User persistedUser = users.findById(studentA.userId()).orElseThrow();
        assertNotEquals("correct-horse-1", persistedUser.getPasswordHash());
        assertTrue(passwordEncoder.matches("correct-horse-1", persistedUser.getPasswordHash()));
        Student persistedStudent = students.findByUserId(studentA.userId()).orElseThrow();
        assertEquals("Student A", persistedStudent.getFullName());
        assertEquals("CS", persistedStudent.getDepartment());

        ResponseEntity<AuthResponse> login = http.postForEntity(url("/api/v1/auth/login"),
                new com.campusflow.dto.auth.LoginRequest("a-" + suffix + "@example.test", "correct-horse-1"),
                AuthResponse.class);
        assertEquals(200, login.getStatusCode().value());
        String tokenA = login.getBody().accessToken();
        assertProtected(tokenA, 200);
        assertProtected("not.a.jwt", 401);
        assertProtected(expiredToken(studentA.userId()), 401);

        AuthResponse studentB = registerStudent("b-" + suffix + "@example.test", "REG-B-" + shortSuffix, "Student B");
        String tokenB = studentB.accessToken();

        ResponseEntity<ResumeResponseDto> uploaded = uploadResume(tokenA, "resume-a.pdf",
                "%PDF-1.7\nCampusFlow integration resume\n");
        assertEquals(201, uploaded.getStatusCode().value());
        ResumeResponseDto uploadedDto = uploaded.getBody();
        assertNotNull(uploadedDto);
        assertEquals(persistedStudent.getId(), uploadedDto.getStudentId());
        assertEquals("application/pdf", uploadedDto.getContentType());

        ResponseEntity<List<ResumeResponseDto>> list = http.exchange(url("/api/v1/student/resumes"),
                HttpMethod.GET, bearer(tokenA), new ParameterizedTypeReference<>() { });
        assertEquals(200, list.getStatusCode().value());
        assertEquals(List.of(uploadedDto.getId()), list.getBody().stream().map(ResumeResponseDto::getId).toList());

        ResponseEntity<ResumeResponseDto> detail = http.exchange(url("/api/v1/student/resumes/" + uploadedDto.getId()),
                HttpMethod.GET, bearer(tokenA), ResumeResponseDto.class);
        assertEquals(200, detail.getStatusCode().value());
        assertEquals(uploadedDto.getId(), detail.getBody().getId());

        String resumeUrl = url("/api/v1/student/resumes/" + uploadedDto.getId());
        assertEquals(404, http.exchange(resumeUrl, HttpMethod.GET, bearer(tokenB), String.class)
                .getStatusCode().value());
        assertEquals(404, http.exchange(resumeUrl, HttpMethod.DELETE, bearer(tokenB), String.class)
                .getStatusCode().value());

        Resume persistedResume = resumes.findById(uploadedDto.getId()).orElseThrow();
        Path storedFile = Path.of(persistedResume.getStoragePath());
        assertTrue(Files.isRegularFile(storedFile), "Uploaded PDF should exist in isolated storage");

        long applicationId = addApplicationReferencingResume(suffix, persistedStudent.getId(), uploadedDto.getId());
        assertEquals(409, http.exchange(resumeUrl, HttpMethod.DELETE, bearer(tokenA), String.class)
                .getStatusCode().value());
        assertTrue(Files.isRegularFile(storedFile), "Rejected deletion must retain the referenced file");

        jdbc.update("DELETE FROM applications WHERE id = ?", applicationId);
        ResponseEntity<Void> deleted = http.exchange(resumeUrl, HttpMethod.DELETE, bearer(tokenA), Void.class);
        assertEquals(204, deleted.getStatusCode().value());
        assertTrue(resumes.findById(uploadedDto.getId()).isEmpty(), "Resume row should be deleted");
        assertFalse(Files.exists(storedFile), "After-commit listener should remove the stored PDF");
    }

    @Test
    void jobLifecyclePersistsAndEnforcesStudentVisibility() {
        String suffix = UUID.randomUUID().toString();
        String shortSuffix = suffix.replace("-", "").substring(0, 12);
        AuthResponse student = registerStudent("job-student-" + suffix + "@example.test",
                "JOB-ST-" + shortSuffix, "Job Test Student");

        Long officerUserId = jdbc.queryForObject(
                "INSERT INTO users(email, password_hash, role) VALUES (?, ?, 'PLACEMENT_OFFICER') RETURNING id",
                Long.class, "job-officer-" + suffix + "@example.test", "test-only-hash");
        jdbc.update("INSERT INTO placement_officers(user_id, employee_id, full_name) VALUES (?, ?, ?)",
                officerUserId, "JOB-OF-" + shortSuffix, "Job Test Officer");
        String officerToken = token(officerUserId, "PLACEMENT_OFFICER");
        Long secondOfficerUserId = jdbc.queryForObject(
                "INSERT INTO users(email, password_hash, role) VALUES (?, ?, 'PLACEMENT_OFFICER') RETURNING id",
                Long.class, "job-officer-2-" + suffix + "@example.test", "test-only-hash");
        jdbc.update("INSERT INTO placement_officers(user_id, employee_id, full_name) VALUES (?, ?, ?)",
                secondOfficerUserId, "JOB-OF2-" + shortSuffix, "Second Job Officer");
        String secondOfficerToken = token(secondOfficerUserId, "PLACEMENT_OFFICER");

        String request = """
                {"companyName":"CampusFlow Test Co","jobTitle":"Backend Engineer",
                 "jobDescription":"Build backend services","location":"Chennai",
                 "employmentType":"FULL_TIME","workMode":"HYBRID","minimumCgpa":null,
                 "salaryMin":50000,"salaryMax":80000,"applicationDeadline":"%s"}
                """.formatted(OffsetDateTime.now().plusDays(14));
        HttpHeaders officerHeaders = bearer(officerToken).getHeaders();
        officerHeaders.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<JobResponseDto> created = http.postForEntity(url("/api/v1/officer/jobs"),
                new HttpEntity<>(request, officerHeaders), JobResponseDto.class);
        assertEquals(201, created.getStatusCode().value());
        JobResponseDto job = created.getBody();
        assertNotNull(job);
        assertEquals("DRAFT", job.getStatus().name());
        assertEquals(officerUserId, jdbc.queryForObject(
                "SELECT u.id FROM jobs j JOIN placement_officers p ON p.id=j.created_by JOIN users u ON u.id=p.user_id WHERE j.id=?",
                Long.class, job.getId()));
        ResponseEntity<String> officerPage = http.exchange(url("/api/v1/officer/jobs?page=0&size=1"),
                HttpMethod.GET, bearer(officerToken), String.class);
        assertEquals(200, officerPage.getStatusCode().value());
        assertTrue(officerPage.getBody().contains("Backend Engineer"));
        assertTrue(officerPage.getBody().contains("\"page\":0"));
        assertTrue(officerPage.getBody().contains("\"size\":1"));
        assertTrue(officerPage.getBody().contains("\"content\":["));
        assertFalse(officerPage.getBody().contains("pageable"));

        ResponseEntity<String> invalidCreate = http.postForEntity(url("/api/v1/officer/jobs"),
                new HttpEntity<>("{\"jobTitle\":\"Missing required fields\"}", officerHeaders), String.class);
        assertEquals(400, invalidCreate.getStatusCode().value());
        assertEquals(401, http.exchange(url("/api/v1/officer/jobs"), HttpMethod.GET,
                new HttpEntity<>(new HttpHeaders()), String.class).getStatusCode().value());
        String updateRequest = request.replace("Backend Engineer", "Updated Backend Engineer");
        ResponseEntity<JobResponseDto> updated = http.exchange(url("/api/v1/officer/jobs/" + job.getId()),
                HttpMethod.PUT, new HttpEntity<>(updateRequest, officerHeaders), JobResponseDto.class);
        assertEquals(200, updated.getStatusCode().value());
        assertEquals("Updated Backend Engineer", updated.getBody().getJobTitle());
        HttpHeaders secondOfficerHeaders = bearer(secondOfficerToken).getHeaders();
        secondOfficerHeaders.setContentType(MediaType.APPLICATION_JSON);
        assertEquals(403, http.exchange(url("/api/v1/officer/jobs/" + job.getId()), HttpMethod.PUT,
                new HttpEntity<>(updateRequest, secondOfficerHeaders), String.class).getStatusCode().value());

        String studentPath = "/api/v1/student/jobs/" + job.getId();
        assertEquals(404, http.exchange(url(studentPath), HttpMethod.GET, bearer(student.accessToken()), String.class)
                .getStatusCode().value());
        ResponseEntity<JobResponseDto> published = http.exchange(url("/api/v1/officer/jobs/" + job.getId() + "/publish"),
                HttpMethod.PATCH, bearer(officerToken), JobResponseDto.class);
        assertEquals(200, published.getStatusCode().value());
        assertEquals("PUBLISHED", published.getBody().getStatus().name());
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM notifications WHERE user_id=? AND notification_type='JOB_UPDATE' AND message LIKE ?",
                Integer.class, student.userId(), "%job #" + job.getId() + ")."));
        assertEquals(200, http.exchange(url(studentPath), HttpMethod.GET, bearer(student.accessToken()), JobResponseDto.class)
                .getStatusCode().value());
        ResponseEntity<String> studentJobs = http.exchange(url("/api/v1/student/jobs?page=0&size=5&location=Chennai&employmentType=FULL_TIME"),
                HttpMethod.GET, bearer(student.accessToken()), String.class);
        assertEquals(200, studentJobs.getStatusCode().value());
        assertTrue(studentJobs.getBody().contains("Updated Backend Engineer"));
        assertTrue(studentJobs.getBody().contains("\"hasNext\":"));

        String cgpaRestrictedRequest = request.replace("Backend Engineer", "CGPA Restricted Role")
                .replace("\"minimumCgpa\":null", "\"minimumCgpa\":8.50");
        ResponseEntity<JobResponseDto> restrictedDraft = http.postForEntity(url("/api/v1/officer/jobs"),
                new HttpEntity<>(cgpaRestrictedRequest, officerHeaders), JobResponseDto.class);
        assertEquals(201, restrictedDraft.getStatusCode().value());
        assertEquals(200, http.exchange(url("/api/v1/officer/jobs/" + restrictedDraft.getBody().getId() + "/publish"),
                HttpMethod.PATCH, bearer(officerToken), JobResponseDto.class).getStatusCode().value());
        assertEquals(404, http.exchange(url("/api/v1/student/jobs/" + restrictedDraft.getBody().getId()),
                HttpMethod.GET, bearer(student.accessToken()), String.class).getStatusCode().value());
        ResponseEntity<String> eligibleListings = http.exchange(url("/api/v1/student/jobs?page=0&size=20"),
                HttpMethod.GET, bearer(student.accessToken()), String.class);
        assertFalse(eligibleListings.getBody().contains("CGPA Restricted Role"));

        ResponseEntity<JobResponseDto> closed = http.exchange(url("/api/v1/officer/jobs/" + job.getId() + "/close"),
                HttpMethod.PATCH, bearer(officerToken), JobResponseDto.class);
        assertEquals("CLOSED", closed.getBody().getStatus().name());
        assertEquals(404, http.exchange(url(studentPath), HttpMethod.GET, bearer(student.accessToken()), String.class)
                .getStatusCode().value());

        String draftRequest = request.replace("Backend Engineer", "Temporary Role");
        ResponseEntity<JobResponseDto> draft = http.postForEntity(url("/api/v1/officer/jobs"),
                new HttpEntity<>(draftRequest, officerHeaders), JobResponseDto.class);
        assertEquals(201, draft.getStatusCode().value());
        assertEquals(204, http.exchange(url("/api/v1/officer/jobs/" + draft.getBody().getId()),
                HttpMethod.DELETE, bearer(officerToken), Void.class).getStatusCode().value());
        assertEquals(404, http.exchange(url("/api/v1/officer/jobs/999999999"), HttpMethod.GET,
                bearer(officerToken), String.class).getStatusCode().value());
        assertEquals(403, http.exchange(url("/api/v1/officer/jobs"), HttpMethod.GET,
                bearer(student.accessToken()), String.class).getStatusCode().value());
    }

    @Test
    void applicationLifecycleEnforcesOwnershipEligibilityAndDatabaseConstraints() {
        String suffix = UUID.randomUUID().toString();
        String shortSuffix = suffix.replace("-", "").substring(0, 12);
        AuthResponse studentA = registerStudent("app-student-a-" + suffix + "@example.test",
                "APP-A-" + shortSuffix, "Application Student A");
        AuthResponse studentB = registerStudent("app-student-b-" + suffix + "@example.test",
                "APP-B-" + shortSuffix, "Application Student B");
        Long officerUserId = addPlacementOfficer("app-officer-" + suffix + "@example.test", "APP-OF-" + shortSuffix);
        Long otherOfficerUserId = addPlacementOfficer("app-officer-other-" + suffix + "@example.test", "APP-OF2-" + shortSuffix);
        String officerToken = token(officerUserId, "PLACEMENT_OFFICER");
        String otherOfficerToken = token(otherOfficerUserId, "PLACEMENT_OFFICER");

        Long openJobId = addJob(officerUserId, "Open Application Role", OffsetDateTime.now().plusDays(10), null, "PUBLISHED");
        Long withdrawJobId = addJob(officerUserId, "Withdraw Role", OffsetDateTime.now().plusDays(10), null, "PUBLISHED");
        Long draftJobId = addJob(officerUserId, "Draft Role", OffsetDateTime.now().plusDays(10), null, "DRAFT");
        Long cgpaJobId = addJob(officerUserId, "CGPA Role", OffsetDateTime.now().plusDays(10), new java.math.BigDecimal("8.50"), "PUBLISHED");
        Long expiredJobId = addJob(officerUserId, "Expired Role", OffsetDateTime.now().minusDays(1), null, "PUBLISHED");
        Long ownershipJobId = addJob(officerUserId, "Resume Ownership Role", OffsetDateTime.now().plusDays(10), null, "PUBLISHED");

        HttpHeaders studentAHeaders = bearer(studentA.accessToken()).getHeaders();
        studentAHeaders.setContentType(MediaType.APPLICATION_JSON);
        assertEquals(401, http.postForEntity(url("/api/v1/student/applications"),
                new HttpEntity<>("{\"jobId\":" + openJobId + "}", new HttpHeaders()), String.class)
                .getStatusCode().value());
        assertEquals(400, http.postForEntity(url("/api/v1/student/applications"),
                new HttpEntity<>("{}", studentAHeaders), String.class).getStatusCode().value());
        assertEquals(409, postApplication(draftJobId, null, studentAHeaders).getStatusCode().value());
        assertEquals(403, postApplication(cgpaJobId, null, studentAHeaders).getStatusCode().value());
        assertEquals(409, postApplication(expiredJobId, null, studentAHeaders).getStatusCode().value());

        ResponseEntity<ResumeResponseDto> resumeA = uploadResume(studentA.accessToken(), "app-a.pdf", "%PDF-1.7\nA\n");
        ResponseEntity<ResumeResponseDto> resumeB = uploadResume(studentB.accessToken(), "app-b.pdf", "%PDF-1.7\nB\n");
        assertEquals(404, postApplication(ownershipJobId, resumeB.getBody().getId(), studentAHeaders).getStatusCode().value());

        ResponseEntity<String> submitted = postApplication(
                openJobId, resumeA.getBody().getId(), studentAHeaders);
        assertEquals(201, submitted.getStatusCode().value());
        assertTrue(submitted.getBody().contains("\"resumeId\":" + resumeA.getBody().getId()));
        Long studentAId = students.findByUserId(studentA.userId()).orElseThrow().getId();
        long mainApplicationId = jdbc.queryForObject("SELECT id FROM applications WHERE student_id=? AND job_id=?",
                Long.class, studentAId, openJobId);
        assertEquals(studentA.userId(), jdbc.queryForObject(
                "SELECT s.user_id FROM applications a JOIN students s ON s.id=a.student_id WHERE a.id=?",
                Long.class, mainApplicationId));
        assertEquals(409, postApplication(openJobId, resumeA.getBody().getId(), studentAHeaders).getStatusCode().value());

        ResponseEntity<String> withdrawApplication = postApplication(withdrawJobId, null, studentAHeaders);
        assertEquals(201, withdrawApplication.getStatusCode().value());
        long applicationId = mainApplicationId;
        long withdrawalId = jdbc.queryForObject("SELECT id FROM applications WHERE student_id=? AND job_id=?",
                Long.class, studentAId, withdrawJobId);
        String studentDetail = "/api/v1/student/applications/" + applicationId;
        assertEquals(404, http.exchange(url(studentDetail), HttpMethod.GET, bearer(studentB.accessToken()), String.class)
                .getStatusCode().value());
        ResponseEntity<String> studentListB = http.exchange(url("/api/v1/student/applications"), HttpMethod.GET,
                bearer(studentB.accessToken()), String.class);
        assertEquals(200, studentListB.getStatusCode().value());
        assertFalse(studentListB.getBody().contains("\"id\":" + applicationId));
        assertEquals(200, http.exchange(url(studentDetail), HttpMethod.GET, bearer(studentA.accessToken()), String.class)
                .getStatusCode().value());
        assertEquals("APPLIED", jdbc.queryForObject("SELECT status FROM applications WHERE id=?", String.class, applicationId));

        String officerList = "/api/v1/officer/applications?page=0&size=10";
        ResponseEntity<String> reviewedList = http.exchange(url(officerList), HttpMethod.GET, bearer(officerToken), String.class);
        assertEquals(200, reviewedList.getStatusCode().value());
        assertTrue(reviewedList.getBody().contains("Open Application Role"));
        assertTrue(reviewedList.getBody().contains("\"content\":["));
        assertEquals(403, http.exchange(url(officerList), HttpMethod.GET, bearer(studentA.accessToken()), String.class)
                .getStatusCode().value());
        assertEquals(404, http.exchange(url("/api/v1/officer/applications/" + applicationId), HttpMethod.GET,
                bearer(otherOfficerToken), String.class).getStatusCode().value());
        assertEquals(404, http.exchange(url("/api/v1/officer/applications/999999999"), HttpMethod.GET,
                bearer(officerToken), String.class).getStatusCode().value());

        assertEquals(200, updateApplicationStatus(applicationId, "UNDER_REVIEW", officerToken).getStatusCode().value());
        assertEquals(200, updateApplicationStatus(applicationId, "SHORTLISTED", officerToken).getStatusCode().value());
        assertEquals(200, updateApplicationStatus(applicationId, "SELECTED", officerToken).getStatusCode().value());
        assertEquals(409, updateApplicationStatus(applicationId, "REJECTED", officerToken).getStatusCode().value());
        assertEquals(404, updateApplicationStatus(applicationId, "REJECTED", otherOfficerToken).getStatusCode().value());

        ResponseEntity<com.campusflow.dto.application.ApplicationResponseDto> withdrawn = http.exchange(
                url("/api/v1/student/applications/" + withdrawalId + "/withdraw"), HttpMethod.PATCH,
                bearer(studentA.accessToken()), com.campusflow.dto.application.ApplicationResponseDto.class);
        assertEquals(200, withdrawn.getStatusCode().value());
        assertEquals("WITHDRAWN", withdrawn.getBody().getStatus().name());
        assertEquals(409, http.exchange(url("/api/v1/student/applications/" + withdrawalId + "/withdraw"),
                HttpMethod.PATCH, bearer(studentA.accessToken()), String.class).getStatusCode().value());

        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "INSERT INTO applications(student_id, job_id, status) VALUES (?, ?, 'APPLIED')",
                students.findByUserId(studentA.userId()).orElseThrow().getId(), openJobId));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM applications WHERE student_id=? AND job_id=?",
                Integer.class, students.findByUserId(studentA.userId()).orElseThrow().getId(), openJobId));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM notifications WHERE user_id=? AND notification_type='APPLICATION_UPDATE' AND message LIKE ?",
                Integer.class, officerUserId, "Application #" + applicationId + "%"));
        assertEquals(3, jdbc.queryForObject("SELECT COUNT(*) FROM notifications WHERE user_id=? AND notification_type='APPLICATION_UPDATE' AND message LIKE ?",
                Integer.class, studentA.userId(), "Your application #" + applicationId + "%"));
    }

    @Test
    void interviewHttpLifecycleEnforcesApplicationAndUserOwnership() {
        String suffix = UUID.randomUUID().toString();
        String shortSuffix = suffix.replace("-", "").substring(0, 12);
        AuthResponse studentA = registerStudent("interview-student-a-" + suffix + "@example.test",
                "INT-A-" + shortSuffix, "Interview Student A");
        AuthResponse studentB = registerStudent("interview-student-b-" + suffix + "@example.test",
                "INT-B-" + shortSuffix, "Interview Student B");
        Long officerUserId = addPlacementOfficer("interview-officer-" + suffix + "@example.test", "INT-OF-" + shortSuffix);
        Long otherOfficerUserId = addPlacementOfficer("interview-officer-2-" + suffix + "@example.test", "INT-OF2-" + shortSuffix);
        String officerToken = token(officerUserId, "PLACEMENT_OFFICER");
        String otherOfficerToken = token(otherOfficerUserId, "PLACEMENT_OFFICER");
        Long jobId = addJob(officerUserId, "Interview Job", OffsetDateTime.now().plusDays(20), null, "PUBLISHED");
        Long applicationId = jdbc.queryForObject(
                "INSERT INTO applications(student_id, job_id, status) VALUES (?, ?, 'SHORTLISTED') RETURNING id",
                Long.class, students.findByUserId(studentA.userId()).orElseThrow().getId(), jobId);

        HttpHeaders officerHeaders = bearer(officerToken).getHeaders();
        officerHeaders.setContentType(MediaType.APPLICATION_JSON);
        HttpHeaders otherOfficerHeaders = bearer(otherOfficerToken).getHeaders();
        otherOfficerHeaders.setContentType(MediaType.APPLICATION_JSON);
        String createBody = """
                {"applicationId":%d,"scheduledAt":"%s","interviewMode":"ONLINE",
                 "locationOrLink":"https://meet.example.test/round-1","notes":"Technical interview"}
                """.formatted(applicationId, OffsetDateTime.now().plusDays(2));
        String officerInterviewsUrl = url("/api/v1/officer/interviews");

        assertEquals(401, http.postForEntity(officerInterviewsUrl,
                new HttpEntity<>(createBody, new HttpHeaders()), String.class).getStatusCode().value());
        HttpHeaders studentHeaders = bearer(studentA.accessToken()).getHeaders();
        studentHeaders.setContentType(MediaType.APPLICATION_JSON);
        assertEquals(403, http.postForEntity(officerInterviewsUrl,
                new HttpEntity<>(createBody, studentHeaders), String.class)
                .getStatusCode().value());
        assertEquals(404, http.postForEntity(officerInterviewsUrl,
                new HttpEntity<>(createBody, otherOfficerHeaders), String.class).getStatusCode().value());
        assertEquals(404, http.postForEntity(officerInterviewsUrl,
                new HttpEntity<>(createBody.replace("\"applicationId\":" + applicationId,
                        "\"applicationId\":999999999"), officerHeaders), String.class).getStatusCode().value());
        String pastBody = """
                {"applicationId":%d,"scheduledAt":"%s","interviewMode":"OFFLINE",
                 "locationOrLink":"Room 10"}
                """.formatted(applicationId, OffsetDateTime.now().minusDays(1));
        assertEquals(400, http.postForEntity(officerInterviewsUrl, new HttpEntity<>(pastBody, officerHeaders), String.class)
                .getStatusCode().value());

        ResponseEntity<String> created = http.postForEntity(officerInterviewsUrl,
                new HttpEntity<>(createBody, officerHeaders), String.class);
        assertEquals(201, created.getStatusCode().value());
        Long interviewId = jdbc.queryForObject("SELECT id FROM interviews WHERE application_id=?", Long.class, applicationId);
        assertEquals("SCHEDULED", jdbc.queryForObject("SELECT status FROM interviews WHERE id=?", String.class, interviewId));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM notifications WHERE user_id=? AND notification_type='INTERVIEW' AND message LIKE ?",
                Integer.class, studentA.userId(), "Interview #" + interviewId + "%"));

        String officerDetail = "/api/v1/officer/interviews/" + interviewId;
        String studentDetail = "/api/v1/student/interviews/" + interviewId;
        assertEquals(200, http.exchange(url(studentDetail), HttpMethod.GET, bearer(studentA.accessToken()), String.class)
                .getStatusCode().value());
        assertEquals(404, http.exchange(url(studentDetail), HttpMethod.GET, bearer(studentB.accessToken()), String.class)
                .getStatusCode().value());
        ResponseEntity<String> studentList = http.exchange(url("/api/v1/student/interviews"), HttpMethod.GET,
                bearer(studentA.accessToken()), String.class);
        assertEquals(200, studentList.getStatusCode().value());
        assertTrue(studentList.getBody().contains("\"applicationId\":" + applicationId));
        ResponseEntity<String> studentBList = http.exchange(url("/api/v1/student/interviews"), HttpMethod.GET,
                bearer(studentB.accessToken()), String.class);
        assertFalse(studentBList.getBody().contains("\"applicationId\":" + applicationId));
        assertEquals(200, http.exchange(url(officerDetail), HttpMethod.GET, bearer(officerToken), String.class)
                .getStatusCode().value());
        assertEquals(404, http.exchange(url(officerDetail), HttpMethod.GET, bearer(otherOfficerToken), String.class)
                .getStatusCode().value());
        assertEquals(200, http.exchange(url("/api/v1/officer/interviews?page=0&size=5"), HttpMethod.GET,
                bearer(officerToken), String.class).getStatusCode().value());
        assertTrue(http.exchange(url("/api/v1/officer/interviews?page=0&size=5"), HttpMethod.GET,
                bearer(officerToken), String.class).getBody().contains("\"totalElements\":1"));

        String updateBody = """
                {"scheduledAt":"%s","interviewMode":"OFFLINE","locationOrLink":"Campus room 3",
                 "notes":"Updated onsite interview"}
                """.formatted(OffsetDateTime.now().plusDays(3));
        HttpHeaders updateHeaders = bearer(officerToken).getHeaders();
        updateHeaders.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<String> updated = http.exchange(url(officerDetail), HttpMethod.PUT,
                new HttpEntity<>(updateBody, updateHeaders), String.class);
        assertEquals(200, updated.getStatusCode().value());
        assertEquals("OFFLINE", jdbc.queryForObject("SELECT interview_mode FROM interviews WHERE id=?", String.class, interviewId));
        assertEquals(2, jdbc.queryForObject("SELECT COUNT(*) FROM notifications WHERE user_id=? AND notification_type='INTERVIEW' AND message LIKE ?",
                Integer.class, studentA.userId(), "Interview #" + interviewId + "%"));
        assertEquals(404, http.exchange(url(officerDetail), HttpMethod.PUT,
                new HttpEntity<>(updateBody, otherOfficerHeaders), String.class).getStatusCode().value());

        HttpHeaders statusHeaders = bearer(officerToken).getHeaders();
        statusHeaders.setContentType(MediaType.APPLICATION_JSON);
        String statusUrl = url(officerDetail + "/status");
        assertEquals(200, http.exchange(statusUrl, HttpMethod.PATCH,
                new HttpEntity<>("{\"status\":\"COMPLETED\"}", statusHeaders), String.class).getStatusCode().value());
        assertEquals(409, http.exchange(statusUrl, HttpMethod.PATCH,
                new HttpEntity<>("{\"status\":\"CANCELLED\"}", statusHeaders), String.class).getStatusCode().value());
        assertEquals(204, http.exchange(url(officerDetail), HttpMethod.DELETE, bearer(officerToken), Void.class)
                .getStatusCode().value());
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM interviews WHERE id=?", Integer.class, interviewId));
        assertEquals(403, http.exchange(url(officerDetail), HttpMethod.DELETE, bearer(studentA.accessToken()), String.class)
                .getStatusCode().value());

        String cancellationBody = """
                {"applicationId":%d,"scheduledAt":"%s","interviewMode":"ONLINE","locationOrLink":"https://meet.example.test/round-2"}
                """.formatted(applicationId, OffsetDateTime.now().plusDays(5));
        ResponseEntity<String> cancellationSchedule = http.postForEntity(officerInterviewsUrl,
                new HttpEntity<>(cancellationBody, officerHeaders), String.class);
        assertEquals(201, cancellationSchedule.getStatusCode().value());
        Long cancellationInterviewId = jdbc.queryForObject("SELECT id FROM interviews WHERE application_id=?",
                Long.class, applicationId);
        assertEquals(200, http.exchange(url("/api/v1/officer/interviews/" + cancellationInterviewId + "/status"),
                HttpMethod.PATCH, new HttpEntity<>("{\"status\":\"CANCELLED\"}", statusHeaders), String.class)
                .getStatusCode().value());
        assertEquals(2, jdbc.queryForObject("SELECT COUNT(*) FROM notifications WHERE user_id=? AND notification_type='INTERVIEW' AND message LIKE ?",
                Integer.class, studentA.userId(), "Interview #" + cancellationInterviewId + "%"));

    }

    @Test
    void notificationReadAndDeleteEndpointsAreScopedToAuthenticatedUser() {
        String suffix = UUID.randomUUID().toString();
        String shortSuffix = suffix.replace("-", "").substring(0, 12);
        AuthResponse studentA = registerStudent("notification-a-" + suffix + "@example.test",
                "NOT-A-" + shortSuffix, "Notification Student A");
        AuthResponse studentB = registerStudent("notification-b-" + suffix + "@example.test",
                "NOT-B-" + shortSuffix, "Notification Student B");
        Long officerUserId = addPlacementOfficer("notification-officer-" + suffix + "@example.test", "NOT-OF-" + shortSuffix);
        var first = notificationService.createNotification(studentA.userId(), "First", "First message", NotificationType.SYSTEM);
        var second = notificationService.createNotification(studentA.userId(), "Second", "Second message", NotificationType.JOB_UPDATE);
        var otherUser = notificationService.createNotification(studentB.userId(), "Private", "Private message", NotificationType.SYSTEM);
        var officerNotification = notificationService.createNotification(officerUserId, "Review", "New application", NotificationType.APPLICATION_UPDATE);

        String studentNotifications = url("/api/v1/student/notifications");
        assertEquals(401, http.exchange(studentNotifications, HttpMethod.GET, new HttpEntity<>(new HttpHeaders()), String.class)
                .getStatusCode().value());
        assertEquals(403, http.exchange(url("/api/v1/officer/notifications"), HttpMethod.GET,
                bearer(studentA.accessToken()), String.class).getStatusCode().value());
        ResponseEntity<String> page = http.exchange(url("/api/v1/student/notifications?page=0&size=1&sort=title,asc"),
                HttpMethod.GET, bearer(studentA.accessToken()), String.class);
        assertEquals(200, page.getStatusCode().value());
        assertTrue(page.getBody().contains("\"totalElements\":2"));
        assertTrue(page.getBody().contains("\"isRead\":false"));
        assertTrue(page.getBody().contains("\"page\":0"));
        assertTrue(page.getBody().contains("\"size\":1"));
        assertTrue(page.getBody().contains("\"totalPages\":2"));
        assertTrue(page.getBody().contains("\"hasNext\":true"));
        assertTrue(page.getBody().contains("\"title\":\"First\""));
        assertFalse(page.getBody().contains("\"title\":\"Second\""));
        assertFalse(page.getBody().contains("pageable"));
        assertEquals(200, http.exchange(url("/api/v1/student/notifications/" + first.getId()), HttpMethod.GET,
                bearer(studentA.accessToken()), String.class).getStatusCode().value());
        assertEquals(404, http.exchange(url("/api/v1/student/notifications/" + first.getId()), HttpMethod.GET,
                bearer(studentB.accessToken()), String.class).getStatusCode().value());
        assertEquals(404, http.exchange(url("/api/v1/student/notifications/" + otherUser.getId()), HttpMethod.GET,
                bearer(studentA.accessToken()), String.class).getStatusCode().value());

        assertEquals(200, http.exchange(url("/api/v1/student/notifications/" + first.getId() + "/read"),
                HttpMethod.PATCH, bearer(studentA.accessToken()), String.class).getStatusCode().value());
        assertTrue(jdbc.queryForObject("SELECT is_read FROM notifications WHERE id=?", Boolean.class, first.getId()));
        assertEquals(404, http.exchange(url("/api/v1/student/notifications/" + otherUser.getId() + "/read"),
                HttpMethod.PATCH, bearer(studentA.accessToken()), String.class).getStatusCode().value());
        assertEquals(204, http.exchange(url("/api/v1/student/notifications/read-all"), HttpMethod.PATCH,
                bearer(studentA.accessToken()), Void.class).getStatusCode().value());
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM notifications WHERE user_id=? AND is_read=false",
                Integer.class, studentA.userId()));
        assertEquals(204, http.exchange(url("/api/v1/student/notifications/" + second.getId()), HttpMethod.DELETE,
                bearer(studentA.accessToken()), Void.class).getStatusCode().value());
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM notifications WHERE id=?", Integer.class, second.getId()));
        assertEquals(404, http.exchange(url("/api/v1/student/notifications/" + otherUser.getId()), HttpMethod.DELETE,
                bearer(studentA.accessToken()), String.class).getStatusCode().value());

        String officerToken = token(officerUserId, "PLACEMENT_OFFICER");
        assertEquals(200, http.exchange(url("/api/v1/officer/notifications/" + officerNotification.getId()), HttpMethod.GET,
                bearer(officerToken), String.class).getStatusCode().value());
        assertEquals(404, http.exchange(url("/api/v1/officer/notifications/" + first.getId()), HttpMethod.GET,
                bearer(officerToken), String.class).getStatusCode().value());
    }

    @AfterAll
    static void removeTemporaryResumeStorage() throws IOException {
        if (Files.exists(RESUME_STORAGE)) {
            try (var paths = Files.walk(RESUME_STORAGE)) {
                paths.sorted(Comparator.reverseOrder()).forEach(path -> {
                    try { Files.deleteIfExists(path); }
                    catch (IOException exception) { throw new IllegalStateException("Could not clean test storage", exception); }
                });
            }
        }
    }

    private AuthResponse registerStudent(String email, String registerNumber, String fullName) {
        var request = new RegisterStudentRequest(email, "correct-horse-1", registerNumber, fullName, "CS", 2030);
        ResponseEntity<AuthResponse> result = http.postForEntity(url("/api/v1/auth/register"), request, AuthResponse.class);
        assertEquals(201, result.getStatusCode().value());
        assertNotNull(result.getBody());
        return result.getBody();
    }

    private ResponseEntity<ResumeResponseDto> uploadResume(String token, String filename, String content) {
        HttpHeaders partHeaders = new HttpHeaders();
        partHeaders.setContentType(MediaType.APPLICATION_PDF);
        partHeaders.setContentDispositionFormData("file", filename);
        ByteArrayResource file = new ByteArrayResource(content.getBytes(java.nio.charset.StandardCharsets.US_ASCII)) {
            @Override public String getFilename() { return filename; }
        };
        MultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
        form.add("file", new HttpEntity<>(file, partHeaders));
        HttpHeaders requestHeaders = bearer(token).getHeaders();
        requestHeaders.setContentType(MediaType.MULTIPART_FORM_DATA);
        return http.exchange(url("/api/v1/student/resumes"), HttpMethod.POST,
                new HttpEntity<>(form, requestHeaders), ResumeResponseDto.class);
    }

    private void assertProtected(String token, int expectedStatus) {
        assertEquals(expectedStatus, http.exchange(url("/api/v1/student/resumes"), HttpMethod.GET,
                bearer(token), String.class).getStatusCode().value());
    }

    private String expiredToken(Long userId) {
        Instant expiresAt = Instant.now().minusSeconds(60);
        var claims = JwtClaimsSet.builder().issuer("campusflow-api").subject(userId.toString())
                .issuedAt(expiresAt.minusSeconds(60)).expiresAt(expiresAt).claim("role", "STUDENT").build();
        return jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();
    }

    private String token(Long userId, String role) {
        Instant now = Instant.now();
        var claims = JwtClaimsSet.builder().issuer("campusflow-api").subject(userId.toString())
                .issuedAt(now).expiresAt(now.plusSeconds(300)).claim("role", role).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();
    }

    private long addApplicationReferencingResume(String suffix, Long studentId, Long resumeId) {
        Long officerUserId = jdbc.queryForObject(
                "INSERT INTO users(email, password_hash, role) VALUES (?, ?, 'PLACEMENT_OFFICER') RETURNING id",
                Long.class, "officer-" + suffix + "@example.test", "test-only-hash");
        Long officerId = jdbc.queryForObject(
                "INSERT INTO placement_officers(user_id, employee_id, full_name) VALUES (?, ?, ?) RETURNING id",
                Long.class, officerUserId, "EMP-" + suffix.replace("-", "").substring(0, 12), "Test Officer");
        Long jobId = jdbc.queryForObject("""
                INSERT INTO jobs(created_by, company_name, job_title, job_description, employment_type,
                                 work_mode, application_deadline)
                VALUES (?, 'CampusFlow Test', 'Integration Role', 'Test job', 'FULL_TIME', 'REMOTE', ?)
                RETURNING id
                """, Long.class, officerId, OffsetDateTime.now().plusDays(1));
        return jdbc.queryForObject("""
                INSERT INTO applications(student_id, job_id, resume_id) VALUES (?, ?, ?) RETURNING id
                """, Long.class, studentId, jobId, resumeId);
    }

    private Long addPlacementOfficer(String email, String employeeId) {
        Long userId = jdbc.queryForObject(
                "INSERT INTO users(email, password_hash, role) VALUES (?, ?, 'PLACEMENT_OFFICER') RETURNING id",
                Long.class, email, "test-only-hash");
        jdbc.update("INSERT INTO placement_officers(user_id, employee_id, full_name) VALUES (?, ?, ?)",
                userId, employeeId, "Integration Placement Officer");
        return userId;
    }

    private Long addJob(Long officerUserId, String title, OffsetDateTime deadline,
                        java.math.BigDecimal minimumCgpa, String status) {
        Long officerId = jdbc.queryForObject("SELECT id FROM placement_officers WHERE user_id=?", Long.class, officerUserId);
        return jdbc.queryForObject("""
                INSERT INTO jobs(created_by, company_name, job_title, job_description, employment_type,
                                 work_mode, minimum_cgpa, application_deadline, status)
                VALUES (?, 'Integration Employer', ?, 'Application integration job', 'FULL_TIME', 'REMOTE', ?, ?, ?)
                RETURNING id
                """, Long.class, officerId, title, minimumCgpa, deadline, status);
    }

    private ResponseEntity<String> postApplication(
            Long jobId, Long resumeId, HttpHeaders headers) {
        String body = "{\"jobId\":" + jobId
                + (resumeId == null ? "" : ",\"resumeId\":" + resumeId)
                + ",\"coverLetter\":\"Integration cover letter\"}";
        return http.postForEntity(url("/api/v1/student/applications"),
                new HttpEntity<>(body, headers), String.class);
    }

    private ResponseEntity<String> updateApplicationStatus(
            Long applicationId, String status, String token) {
        HttpHeaders headers = bearer(token).getHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return http.exchange(url("/api/v1/officer/applications/" + applicationId + "/status"), HttpMethod.PATCH,
                new HttpEntity<>("{\"status\":\"" + status + "\"}", headers),
                String.class);
    }

    private HttpEntity<Void> bearer(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return new HttpEntity<>(headers);
    }

    private String url(String path) { return "http://localhost:" + port + path; }
}
