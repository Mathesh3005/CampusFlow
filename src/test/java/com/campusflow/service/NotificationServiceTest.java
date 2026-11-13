package com.campusflow.service;

import com.campusflow.entity.Notification;
import com.campusflow.entity.NotificationType;
import com.campusflow.entity.Role;
import com.campusflow.entity.Student;
import com.campusflow.entity.User;
import com.campusflow.repository.NotificationRepository;
import com.campusflow.repository.StudentRepository;
import com.campusflow.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {
    @Mock NotificationRepository notificationRepository;
    @Mock UserRepository userRepository;
    @Mock StudentRepository studentRepository;
    @InjectMocks NotificationService service;

    @Test
    void createsNotificationForExistingUserWithUnreadDefault() {
        User user = new User("student@example.test", "hash", Role.STUDENT);
        when(userRepository.findById(9L)).thenReturn(Optional.of(user));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Notification saved = service.createNotification(9L, "  Title  ", "  Message  ", NotificationType.SYSTEM);

        assertEquals("Title", saved.getTitle());
        assertEquals("Message", saved.getMessage());
        assertFalse(saved.getIsRead());
        assertEquals(NotificationType.SYSTEM, saved.getNotificationType());
    }

    @Test
    void duplicateEventContentIsIgnored() {
        when(notificationRepository.existsByUser_IdAndTitleAndMessageAndNotificationType(
                9L, "Interview scheduled", "Interview #11 at 12:00", NotificationType.INTERVIEW)).thenReturn(true);

        service.createNotificationIfAbsent(9L, "Interview scheduled", "Interview #11 at 12:00", NotificationType.INTERVIEW);

        verify(notificationRepository, never()).save(any(Notification.class));
    }

    @Test
    void jobPublicationNotifiesActiveEligibleStudentsOnly() {
        Student student = mock(Student.class);
        User activeStudent = mock(User.class);
        when(studentRepository.findAll()).thenReturn(List.of(student));
        when(student.getUser()).thenReturn(activeStudent);
        when(activeStudent.getRole()).thenReturn(Role.STUDENT);
        when(activeStudent.getIsActive()).thenReturn(true);
        when(activeStudent.getId()).thenReturn(9L);
        when(notificationRepository.existsByUser_IdAndTitleAndMessageAndNotificationType(anyLong(), anyString(),
                anyString(), eq(NotificationType.JOB_UPDATE))).thenReturn(false);
        when(userRepository.findById(9L)).thenReturn(Optional.of(new User("student@example.test", "hash", Role.STUDENT)));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> invocation.getArgument(0));

        com.campusflow.entity.Job job = new com.campusflow.entity.Job(null, "Company", "Role", "Description",
                com.campusflow.entity.EmploymentType.FULL_TIME, com.campusflow.entity.WorkMode.REMOTE,
                java.time.OffsetDateTime.now().plusDays(1));
        service.jobPublished(job);

        verify(notificationRepository).save(any(Notification.class));
    }
}
