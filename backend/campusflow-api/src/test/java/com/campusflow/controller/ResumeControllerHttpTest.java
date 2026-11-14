package com.campusflow.controller;

import com.campusflow.config.ResumeStorageProperties;
import com.campusflow.config.SecurityConfig;
import com.campusflow.entity.Resume;
import com.campusflow.entity.Student;
import com.campusflow.repository.StudentRepository;
import com.campusflow.security.UserDetailsServiceImpl;
import com.campusflow.service.AuthenticatedStudentService;
import com.campusflow.service.ResumeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.ServletWebSecurityAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ResumeController.class)
@Import({SecurityConfig.class, AuthenticatedStudentService.class, ResumeExceptionHandler.class})
@ImportAutoConfiguration(ServletWebSecurityAutoConfiguration.class)
@TestPropertySource(properties = {
        "app.jwt.secret=MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE=",
        "app.file.max-size=5242880"
})
class ResumeControllerHttpTest {
    private static final Long USER_ID = 135L;
    private static final Long STUDENT_ID = 77L;
    private static final Instant NOW = Instant.now();

    @Autowired MockMvc mvc;
    @MockitoBean ResumeService resumeService;
    @MockitoBean StudentRepository studentRepository;
    @MockitoBean JwtDecoder jwtDecoder;
    @MockitoBean UserDetailsServiceImpl userDetailsService;
    @MockitoBean ResumeStorageProperties storageProperties;

    @BeforeEach
    void setUp() {
        when(jwtDecoder.decode("student-token")).thenReturn(Jwt.withTokenValue("student-token")
                .header("alg", "HS256").subject(USER_ID.toString()).claim("role", "STUDENT")
                .issuedAt(NOW).expiresAt(NOW.plusSeconds(300)).build());
        when(jwtDecoder.decode("invalid-token")).thenThrow(new BadJwtException("Invalid token"));
        when(studentRepository.findByUserId(USER_ID)).thenReturn(Optional.of(student(STUDENT_ID)));
        when(storageProperties.getMaxSize()).thenReturn(5L * 1024 * 1024);
    }

    @Test
    void uploadReturnsCreatedDtoAndUsesAuthenticatedStudent() throws Exception {
        Resume resume = resume(10L, STUDENT_ID, true);
        when(resumeService.createResume(eq(STUDENT_ID), any())).thenReturn(resume);

        mvc.perform(multipart("/api/v1/student/resumes").file(pdf("resume.pdf", "%PDF-1.7")))
                .andExpect(status().isUnauthorized());
        mvc.perform(multipart("/api/v1/student/resumes").file(pdf("resume.pdf", "%PDF-1.7"))
                        .header("Authorization", "Bearer student-token"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", is(10)))
                .andExpect(jsonPath("$.studentId", is(77)))
                .andExpect(jsonPath("$.fileName", is("resume.pdf")));
        verify(studentRepository).findByUserId(USER_ID);
        verify(resumeService).createResume(eq(STUDENT_ID), any());
    }

    @Test
    void uploadRejectsNonPdfOversizeAndInvalidPdfSignature() throws Exception {
        mvc.perform(multipart("/api/v1/student/resumes").file(new MockMultipartFile(
                                "file", "resume.txt", "text/plain", "not a pdf".getBytes()))
                        .header("Authorization", "Bearer student-token"))
                .andExpect(status().isBadRequest());

        when(storageProperties.getMaxSize()).thenReturn(5L);
        mvc.perform(multipart("/api/v1/student/resumes").file(new MockMultipartFile(
                                "file", "large.pdf", MediaType.APPLICATION_PDF_VALUE, "%PDF-123".getBytes()))
                        .header("Authorization", "Bearer student-token"))
                .andExpect(status().isPayloadTooLarge());

        when(storageProperties.getMaxSize()).thenReturn(5L * 1024 * 1024);
        when(resumeService.createResume(eq(STUDENT_ID), any()))
                .thenThrow(new IllegalArgumentException("Only valid PDF files are allowed"));
        mvc.perform(multipart("/api/v1/student/resumes").file(new MockMultipartFile(
                                "file", "fake.pdf", MediaType.APPLICATION_PDF_VALUE, "not a pdf".getBytes()))
                        .header("Authorization", "Bearer student-token"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail", is("Only valid PDF files are allowed")));
        verify(resumeService).createResume(eq(STUDENT_ID), any());
    }

    @Test
    void listingAndDetailAreScopedToAuthenticatedStudentAndReturnDtos() throws Exception {
        when(resumeService.getResumesByStudent(STUDENT_ID))
                .thenReturn(List.of(resume(10L, STUDENT_ID, true), resume(11L, STUDENT_ID, false)));
        when(resumeService.getResumeByIdAndStudent(10L, STUDENT_ID)).thenReturn(resume(10L, STUDENT_ID, true));

        mvc.perform(get("/api/v1/student/resumes").header("Authorization", "Bearer student-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id", is(10)));
        mvc.perform(get("/api/v1/student/resumes/10").header("Authorization", "Bearer student-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId", is(77)));
        verify(resumeService).getResumesByStudent(STUDENT_ID);
        verify(resumeService).getResumeByIdAndStudent(10L, STUDENT_ID);
    }

    @Test
    void otherStudentsResumeIsNotFound() throws Exception {
        when(resumeService.getResumeByIdAndStudent(10L, STUDENT_ID))
                .thenThrow(new com.campusflow.exception.ResumeNotFoundException("Resume not found"));
        mvc.perform(get("/api/v1/student/resumes/10").header("Authorization", "Bearer student-token"))
                .andExpect(status().isNotFound());
    }

    @Test
    void activateAndDeactivateReturnUpdatedDtosAndUseOwnerId() throws Exception {
        when(resumeService.activateResume(10L, STUDENT_ID)).thenReturn(resume(10L, STUDENT_ID, true));
        when(resumeService.deactivateResume(10L, STUDENT_ID)).thenReturn(resume(10L, STUDENT_ID, false));

        mvc.perform(patch("/api/v1/student/resumes/10/activate").header("Authorization", "Bearer student-token"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.active", is(true)));
        mvc.perform(patch("/api/v1/student/resumes/10/deactivate").header("Authorization", "Bearer student-token"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.active", is(false)));
        verify(resumeService).activateResume(10L, STUDENT_ID);
        verify(resumeService).deactivateResume(10L, STUDENT_ID);
    }

    @Test
    void deleteReturnsNoContentAndReferencedResumeReturnsConflict() throws Exception {
        mvc.perform(delete("/api/v1/student/resumes/10").header("Authorization", "Bearer student-token"))
                .andExpect(status().isNoContent());
        verify(resumeService).deleteResume(10L, STUDENT_ID);

        doThrow(new com.campusflow.exception.ResumeInUseException("Resume is referenced by an application"))
                .when(resumeService).deleteResume(11L, STUDENT_ID);
        mvc.perform(delete("/api/v1/student/resumes/11").header("Authorization", "Bearer student-token"))
                .andExpect(status().isConflict());
    }

    @Test
    void invalidJwtIsRejected() throws Exception {
        mvc.perform(get("/api/v1/student/resumes").header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isUnauthorized());
    }

    private static MockMultipartFile pdf(String name, String content) {
        return new MockMultipartFile("file", name, MediaType.APPLICATION_PDF_VALUE, content.getBytes());
    }

    private static Student student(Long id) {
        Student student = new Student(null, "S-135", "Student One", "CS", 2030);
        setId(Student.class, student, id);
        return student;
    }

    private static Resume resume(Long id, Long studentId, boolean active) {
        Resume resume = new Resume(student(studentId), "resume.pdf", "stored/path.pdf", 512L);
        resume.setIsActive(active);
        setId(Resume.class, resume, id);
        return resume;
    }

    private static void setId(Class<?> type, Object entity, Long id) {
        try {
            var field = type.getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (ReflectiveOperationException exception) {
            throw new AssertionError(exception);
        }
    }
}
