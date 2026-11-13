-- ============================================
-- CampusFlow - Initial Database Schema
-- Flyway Migration: V1
-- ============================================

-- 1. USERS
CREATE TABLE users (
                       id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                       email VARCHAR(255) NOT NULL,
                       password_hash VARCHAR(255) NOT NULL,
                       role VARCHAR(30) NOT NULL,
                       is_active BOOLEAN NOT NULL DEFAULT TRUE,
                       created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                       updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                       CONSTRAINT chk_users_email_lowercase
                           CHECK (email = LOWER(BTRIM(email))),

                       CONSTRAINT chk_users_role
                           CHECK (role IN ('STUDENT', 'PLACEMENT_OFFICER', 'ADMIN'))
);

CREATE UNIQUE INDEX idx_users_email_unique ON users(email);


-- 2. STUDENTS
CREATE TABLE students (
                          id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                          user_id BIGINT NOT NULL UNIQUE,
                          register_number VARCHAR(30) NOT NULL UNIQUE,
                          full_name VARCHAR(150) NOT NULL,
                          department VARCHAR(100) NOT NULL,
                          graduation_year INTEGER NOT NULL,
                          cgpa NUMERIC(4,2),
                          phone VARCHAR(15),
                          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                          CONSTRAINT fk_students_user
                              FOREIGN KEY (user_id) REFERENCES users(id),

                          CONSTRAINT chk_students_cgpa
                              CHECK (cgpa IS NULL OR cgpa BETWEEN 0 AND 10),

                          CONSTRAINT chk_students_graduation_year
                              CHECK (graduation_year BETWEEN 2020 AND 2040)
);


-- 3. PLACEMENT OFFICERS
CREATE TABLE placement_officers (
                                    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                                    user_id BIGINT NOT NULL UNIQUE,
                                    employee_id VARCHAR(30) NOT NULL UNIQUE,
                                    full_name VARCHAR(150) NOT NULL,
                                    department VARCHAR(100),
                                    phone VARCHAR(15),
                                    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                    CONSTRAINT fk_placement_officers_user
                                        FOREIGN KEY (user_id) REFERENCES users(id)
);


-- 4. SKILLS
CREATE TABLE skills (
                        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                        name VARCHAR(100) NOT NULL,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                        CONSTRAINT uq_skills_name UNIQUE (name)
);


-- 5. JOBS
CREATE TABLE jobs (
                      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                      created_by BIGINT NOT NULL,
                      company_name VARCHAR(150) NOT NULL,
                      job_title VARCHAR(150) NOT NULL,
                      job_description TEXT NOT NULL,
                      location VARCHAR(150),
                      employment_type VARCHAR(30) NOT NULL,
                      work_mode VARCHAR(30) NOT NULL,
                      minimum_cgpa NUMERIC(4,2),
                      salary_min NUMERIC(12,2),
                      salary_max NUMERIC(12,2),
                      application_deadline TIMESTAMPTZ NOT NULL,
                      status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
                      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                      CONSTRAINT fk_jobs_placement_officer
                          FOREIGN KEY (created_by) REFERENCES placement_officers(id),

                      CONSTRAINT chk_jobs_status
                          CHECK (status IN ('DRAFT', 'PUBLISHED', 'CLOSED')),

                      CONSTRAINT chk_jobs_employment_type
                          CHECK (employment_type IN ('FULL_TIME', 'INTERNSHIP')),

                      CONSTRAINT chk_jobs_work_mode
                          CHECK (work_mode IN ('ONSITE', 'REMOTE', 'HYBRID')),

                      CONSTRAINT chk_jobs_minimum_cgpa
                          CHECK (minimum_cgpa IS NULL OR minimum_cgpa BETWEEN 0 AND 10),

                      CONSTRAINT chk_jobs_salary
                          CHECK (
                              (salary_min IS NULL OR salary_min >= 0)
                                  AND (salary_max IS NULL OR salary_max >= 0)
                                  AND (salary_min IS NULL OR salary_max IS NULL
                                  OR salary_max >= salary_min)
                              )
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_deadline ON jobs(application_deadline);
CREATE INDEX idx_jobs_created_by ON jobs(created_by);


-- 6. STUDENT SKILLS
CREATE TABLE student_skills (
                                student_id BIGINT NOT NULL,
                                skill_id BIGINT NOT NULL,
                                proficiency_level VARCHAR(20),
                                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                CONSTRAINT pk_student_skills
                                    PRIMARY KEY (student_id, skill_id),

                                CONSTRAINT fk_student_skills_student
                                    FOREIGN KEY (student_id) REFERENCES students(id),

                                CONSTRAINT fk_student_skills_skill
                                    FOREIGN KEY (skill_id) REFERENCES skills(id),

                                CONSTRAINT chk_proficiency_level
                                    CHECK (
                                        proficiency_level IS NULL
                                            OR proficiency_level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')
                                        )
);

CREATE INDEX idx_student_skills_skill ON student_skills(skill_id);


-- 7. JOB SKILLS
CREATE TABLE job_skills (
                            job_id BIGINT NOT NULL,
                            skill_id BIGINT NOT NULL,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                            CONSTRAINT pk_job_skills
                                PRIMARY KEY (job_id, skill_id),

                            CONSTRAINT fk_job_skills_job
                                FOREIGN KEY (job_id) REFERENCES jobs(id),

                            CONSTRAINT fk_job_skills_skill
                                FOREIGN KEY (skill_id) REFERENCES skills(id)
);

CREATE INDEX idx_job_skills_skill ON job_skills(skill_id);


-- 8. PROJECTS
CREATE TABLE projects (
                          id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                          student_id BIGINT NOT NULL,
                          title VARCHAR(150) NOT NULL,
                          description TEXT,
                          github_url VARCHAR(500),
                          live_demo_url VARCHAR(500),
                          start_date DATE,
                          end_date DATE,
                          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                          CONSTRAINT fk_projects_student
                              FOREIGN KEY (student_id) REFERENCES students(id),

                          CONSTRAINT chk_project_dates
                              CHECK (
                                  start_date IS NULL OR end_date IS NULL
                                      OR end_date >= start_date
                                  )
);

CREATE INDEX idx_projects_student ON projects(student_id);


-- 9. PROJECT SKILLS
CREATE TABLE project_skills (
                                project_id BIGINT NOT NULL,
                                skill_id BIGINT NOT NULL,

                                CONSTRAINT pk_project_skills
                                    PRIMARY KEY (project_id, skill_id),

                                CONSTRAINT fk_project_skills_project
                                    FOREIGN KEY (project_id) REFERENCES projects(id),

                                CONSTRAINT fk_project_skills_skill
                                    FOREIGN KEY (skill_id) REFERENCES skills(id)
);

CREATE INDEX idx_project_skills_skill ON project_skills(skill_id);


-- 10. RESUMES
CREATE TABLE resumes (
                         id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                         student_id BIGINT NOT NULL,
                         file_name VARCHAR(255) NOT NULL,
                         storage_path VARCHAR(500) NOT NULL,
                         file_size BIGINT NOT NULL,
                         content_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
                         is_active BOOLEAN NOT NULL DEFAULT TRUE,
                         uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                         CONSTRAINT fk_resumes_student
                             FOREIGN KEY (student_id) REFERENCES students(id),

                         CONSTRAINT chk_resume_file_size
                             CHECK (file_size > 0 AND file_size <= 5242880),

                         CONSTRAINT chk_resume_content_type
                             CHECK (content_type = 'application/pdf'),

                         CONSTRAINT uq_resumes_id_student
                             UNIQUE (id, student_id)
);

CREATE INDEX idx_resumes_student ON resumes(student_id);


-- 11. APPLICATIONS
CREATE TABLE applications (
                              id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                              student_id BIGINT NOT NULL,
                              job_id BIGINT NOT NULL,
                              resume_id BIGINT,
                              status VARCHAR(30) NOT NULL DEFAULT 'APPLIED',
                              cover_letter TEXT,
                              applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                              updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                              CONSTRAINT fk_applications_student
                                  FOREIGN KEY (student_id) REFERENCES students(id),

                              CONSTRAINT fk_applications_job
                                  FOREIGN KEY (job_id) REFERENCES jobs(id),

                              CONSTRAINT fk_applications_resume_student
                                  FOREIGN KEY (resume_id, student_id)
                                      REFERENCES resumes(id, student_id),

                              CONSTRAINT uq_student_job
                                  UNIQUE (student_id, job_id),

                              CONSTRAINT chk_application_status
                                  CHECK (
                                      status IN (
                                                 'APPLIED',
                                                 'UNDER_REVIEW',
                                                 'SHORTLISTED',
                                                 'REJECTED',
                                                 'SELECTED',
                                                 'WITHDRAWN'
                                          )
                                      )
);

CREATE INDEX idx_applications_job ON applications(job_id);
CREATE INDEX idx_applications_status ON applications(status);


-- 12. INTERVIEWS
CREATE TABLE interviews (
                            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                            application_id BIGINT NOT NULL,
                            scheduled_at TIMESTAMPTZ NOT NULL,
                            interview_mode VARCHAR(20) NOT NULL,
                            location_or_link VARCHAR(500),
                            status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
                            notes TEXT,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                            CONSTRAINT fk_interviews_application
                                FOREIGN KEY (application_id) REFERENCES applications(id),

                            CONSTRAINT chk_interview_mode
                                CHECK (interview_mode IN ('ONLINE', 'OFFLINE')),

                            CONSTRAINT chk_interview_status
                                CHECK (status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED'))
);

CREATE INDEX idx_interviews_application ON interviews(application_id);
CREATE INDEX idx_interviews_scheduled_at ON interviews(scheduled_at);


-- 13. NOTIFICATIONS
CREATE TABLE notifications (
                               id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                               user_id BIGINT NOT NULL,
                               title VARCHAR(150) NOT NULL,
                               message TEXT NOT NULL,
                               notification_type VARCHAR(30) NOT NULL,
                               is_read BOOLEAN NOT NULL DEFAULT FALSE,
                               created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                               CONSTRAINT fk_notifications_user
                                   FOREIGN KEY (user_id) REFERENCES users(id),

                               CONSTRAINT chk_notification_type
                                   CHECK (
                                       notification_type IN (
                                                             'JOB_UPDATE',
                                                             'APPLICATION_UPDATE',
                                                             'INTERVIEW',
                                                             'SYSTEM'
                                           )
                                       )
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread
    ON notifications(user_id, is_read);