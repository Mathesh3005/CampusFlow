package com.campusflow.service;

import com.campusflow.entity.Application;
import com.campusflow.entity.ApplicationStatus;
import com.campusflow.entity.EmploymentType;
import com.campusflow.entity.Job;
import com.campusflow.entity.JobStatus;
import com.campusflow.entity.Resume;
import com.campusflow.entity.Student;
import com.campusflow.entity.WorkMode;
import com.campusflow.exception.ApplicationConflictException;
import com.campusflow.exception.InvalidApplicationTransitionException;
import com.campusflow.repository.ApplicationRepository;
import com.campusflow.repository.JobRepository;
import com.campusflow.repository.ResumeRepository;
import com.campusflow.repository.StudentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ApplicationServiceTest {
    @Mock ApplicationRepository applicationRepository;
    @Mock StudentRepository studentRepository;
    @Mock JobRepository jobRepository;
    @Mock ResumeRepository resumeRepository;
    @Mock NotificationService notificationService;
    @InjectMocks ApplicationService service;

    @Test
    void applicationSubmissionUsesStudentAndOwnedResumeAndPersistsCoverLetter() {
        Student student = student(31L, new BigDecimal("8.20"));
        Job job = job(JobStatus.PUBLISHED, null, OffsetDateTime.now().plusDays(2));
        Resume resume = mock(Resume.class);
        when(resume.getStudent()).thenReturn(student);
        when(studentRepository.findById(31L)).thenReturn(Optional.of(student));
        when(jobRepository.findById(41L)).thenReturn(Optional.of(job));
        when(applicationRepository.existsByStudentIdAndJobId(31L, 41L)).thenReturn(false);
        when(resumeRepository.findByIdAndStudentId(51L, 31L)).thenReturn(Optional.of(resume));
        when(applicationRepository.saveAndFlush(any(Application.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Application saved = service.applyForJob(31L, 41L, 51L, "My application");

        assertEquals(ApplicationStatus.APPLIED, saved.getStatus());
        assertEquals("My application", saved.getCoverLetter());
        assertSame(resume, saved.getResume());
        verify(applicationRepository).saveAndFlush(any(Application.class));
    }

    @Test
    void duplicateApplicationIsRejectedBeforePersistence() {
        Student student = student(31L, null);
        when(studentRepository.findById(31L)).thenReturn(Optional.of(student));
        when(jobRepository.findById(41L)).thenReturn(Optional.of(job(JobStatus.PUBLISHED, null,
                OffsetDateTime.now().plusDays(2))));
        when(applicationRepository.existsByStudentIdAndJobId(31L, 41L)).thenReturn(true);

        assertThrows(ApplicationConflictException.class, () -> service.applyForJob(31L, 41L, null, null));
        verify(applicationRepository, never()).saveAndFlush(any(Application.class));
    }

    @Test
    void officerStatusTransitionsFollowTheApplicationLifecycle() {
        Application application = new Application(null, null, null);
        when(applicationRepository.findByIdAndJob_CreatedBy_User_Id(71L, 81L)).thenReturn(Optional.of(application));
        when(applicationRepository.save(any(Application.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.updateApplicationStatusForOfficer(71L, 81L, ApplicationStatus.UNDER_REVIEW);
        service.updateApplicationStatusForOfficer(71L, 81L, ApplicationStatus.SHORTLISTED);
        service.updateApplicationStatusForOfficer(71L, 81L, ApplicationStatus.SELECTED);

        assertEquals(ApplicationStatus.SELECTED, application.getStatus());
        assertThrows(InvalidApplicationTransitionException.class,
                () -> service.updateApplicationStatusForOfficer(71L, 81L, ApplicationStatus.REJECTED));
    }

    @Test
    void studentWithInsufficientCgpaCannotApply() {
        Student student = student(31L, new BigDecimal("6.90"));
        when(studentRepository.findById(31L)).thenReturn(Optional.of(student));
        when(jobRepository.findById(41L)).thenReturn(Optional.of(job(JobStatus.PUBLISHED,
                new BigDecimal("7.00"), OffsetDateTime.now().plusDays(2))));
        when(applicationRepository.existsByStudentIdAndJobId(31L, 41L)).thenReturn(false);

        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> service.applyForJob(31L, 41L, null, null));
        verify(applicationRepository, never()).saveAndFlush(any(Application.class));
    }

    private static Job job(JobStatus status, BigDecimal minimumCgpa, OffsetDateTime deadline) {
        Job job = new Job(null, "Example Co", "Backend Engineer", "Job description",
                EmploymentType.FULL_TIME, WorkMode.REMOTE, deadline);
        job.setStatus(status);
        job.setMinimumCgpa(minimumCgpa);
        return job;
    }

    private static Student student(Long id, BigDecimal cgpa) {
        Student student = new Student(null, "TEST-" + id, "Test Student", "CS", 2030);
        student.setCgpa(cgpa);
        try {
            var field = Student.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(student, id);
            return student;
        } catch (ReflectiveOperationException ex) {
            throw new AssertionError(ex);
        }
    }
}
