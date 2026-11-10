# CampusFlow – Enterprise Product & Project Documentation Pack
**Version:** 2.0 (MNC Enterprise Grade & Production-Ready Standard)  
**Author:** Mathesh S. (Lead Full-Stack Architect & Software Engineer)  
**Tech Stack:** Angular + TypeScript (Frontend) | Java 21 + Spring Boot 3.x (Backend) | PostgreSQL 16 (Database)  
**Target Deployment:** AWS / Cloud-Native Kubernetes Infrastructure with CI/CD Pipelines

---

## Document Control & Executive Summary

| Document Field | Production Specification Value |
| :--- | :--- |
| **Product Name** | CampusFlow (Enterprise College Placement & Career Intelligence Platform) |
| **Document Classification** | Level 1: Confidential – Engineering, Product & Governance Master Spec |
| **Current Baseline** | v2.0 – Production-Hardened Architecture & Enterprise Governance |
| **Engineering Ownership** | Core Backend (Java/Spring Boot) & Full-Stack Architecture |
| **Compliance Standard** | ISO/IEC 27001 Security Baseline, OWASP Top 10 Mitigated, RESTful API Level 3 |

---

## 1. Executive Product Overview & Strategic Scope

### 1.1 Product Summary & Enterprise Positioning
CampusFlow is a cloud-native, highly scalable enterprise placement management ecosystem designed to eliminate fragmented administrative workflows across tier-1 higher education institutions. By unifying student career lifecycle management, corporate recruiter pipelines, real-time application telemetry, and RBAC-governed administrative controls into a single pane of glass, CampusFlow guarantees absolute data integrity, auditability, and operational velocity.

### 1.2 Enterprise Problem Statement & Solution Architecture
* **The Problem:** Traditional campus placement operations suffer from data siloing, unverified student profiles distributed across unstructured spreadsheets, lack of deterministic state tracking for multi-round interview pipelines, and vulnerability to privilege escalation attacks.
* **The Enterprise Solution:** CampusFlow provides a modular monolith architecture backed by Spring Boot 3.x security filters, immutable database audit logs, atomic transaction boundaries, and strict DTO projection contracts to guarantee zero data leakage and high availability.

### 1.3 Out-of-Scope (v2.0 Boundary) & Future Roadmap
* **Excluded from v2.0:** Multi-tenant SaaS isolation across disparate universities (scoped for v3.0), automated AI resume ranking engines (pending compliance validation), and native mobile applications (deferred to PWA web-first strategy).

---

## 2. Software Requirements Specification (SRS)

### 2.1 Functional Requirements Matrix
* **FR-01: Institutional Registration:** Secure user onboarding via institutional email domains with automatic domain whitelist validation and BCrypt password hashing.
* **FR-02: Stateless JWT Authentication:** Token-based authentication using short-lived access tokens (15 mins) and cryptographically secure refresh token rotation.
* **FR-03: Role-Based Access Control (RBAC):** Granular method-level security enforced via Spring Security `@PreAuthorize` annotations across `STUDENT`, `PLACEMENT_OFFICER`, and `ADMIN` tiers.
* **FR-04: Academic & Portfolio Profile Management:** Comprehensive student profile control spanning verified GPA, technical skills matrix, and deployed project repositories.
* **FR-05: Secure Document Storage Management:** End-to-end encrypted PDF resume management utilizing UUID generation to prevent enumeration attacks, backed by private storage buckets.
* **FR-06: Enterprise Job Lifecycle Management:** Full-featured recruiter workflow encompassing Draft creation, administrative moderation, scheduled publishing, applicant cutoff automation, and graceful archiving.
* **FR-07: Atomic Job Application Pipeline:** Idempotent job application submission enforcing strict eligibility gates (minimum CGPA, graduation year, resume verification, and deadline checks).
* **FR-08: Multi-Stage Interview Telemetry:** Placement officer scheduling interface supporting synchronous calendar tracking, meeting link generation, round categorization, and feedback logging.
* **FR-09: Real-Time Notification Broker:** Asynchronous in-app alert generation triggered on application state mutations and interview scheduling changes.
* **FR-10: System Administration & Audit Logging:** Master administrative console for tenant user lifecycle management, account deactivation, and security audit trail extraction.

### 2.2 Non-Functional Requirements (NFR)
* **NFR-01 (Security & Compliance):** Zero unauthenticated entry points; all PII encrypted at rest using AES-256 and in transit via TLS 1.3.
* **NFR-02 (Performance & Scalability):** P95 API response latency under 150ms for paginated list endpoints; database connection pooling configured via HikariCP.
* **NFR-03 (Fault Tolerance & Resilience):** Centralized global exception handling returning RFC 7807 compliant problem details; zero stack trace leakage to clients.
* **NFR-04 (Maintainability & Clean Architecture):** Strict adherence to layered architecture (Controller $\rightarrow$ Service $\rightarrow$ Repository) with zero circular dependencies across Spring beans.

---

## 3. User Roles and Permission Matrix

| System Capability / Workflow | Student | Placement Officer | System Administrator |
| :--- | :--- | :--- | :--- |
| **Profile Management** | View/Update Own Profile | View Assigned Department Profiles | Full Read/Write/Deactivate |
| **Job Board Access** | Browse & Filter Published Jobs | Create, Edit, Publish, Close Jobs | Full Administrative Override |
| **Application Submission** | Apply with Verified Resume | None (Prohibited) | None (Prohibited) |
| **Applicant Review Pipeline** | View Own Application Status | Review, Shortlist, Reject, Select | Cross-Department Oversight |
| **Interview Orchestration** | View Scheduled Interviews | Schedule, Reschedule, Complete | Audit & Oversee Schedules |
| **Account Administration** | None | None | User Activation, Role Tuning |

---

## 4. Enterprise System Architecture

### 4.1 Modular Monolith Component Design
CampusFlow is structured as a decoupled enterprise application, separating the Angular Single Page Application (SPA) frontend from the enterprise Java backend service.

```
+-------------------------------------------------------------+
|                Angular 18+ Enterprise SPA                   |
|       (Standalone Components, Signals, Interceptors)        |
+------------------------------+------------------------------+
                               | HTTPS / JSON / Bearer JWT
                               v
+-------------------------------------------------------------+
|               Spring Boot 3.x Enterprise Core               |
|  +-----------------------+     +-------------------------+  |
|  | Spring Security Filter| --> | Global Exception Handler|  |
|  +-----------------------+     +-------------------------+  |
|  +-------------------------------------------------------+  |
|  | Auth | Student | Job | Application | Interview | Admin  |  |
|  +-------------------------------------------------------+  |
|  +-----------------------+     +-------------------------+  |
|  | Spring Data JPA / Hiber| --> | HikariCP Connection Pool|  |
|  +-----------------------+     +-------------------------+  |
+------------------------------+------------------------------+
                               | JDBC / SSL
                               v
+-------------------------------------------------------------+
|                     PostgreSQL 16 Cluster                   |
+-------------------------------------------------------------+
```

### 4.2 Technology Stack Justification
* **Frontend:** Angular with TypeScript for robust compile-time type safety, dependency injection, and enterprise-grade reactive forms.
* **Backend:** Java 21 (LTS) & Spring Boot 3.x leveraging virtual threads, modern pattern matching, and high-performance garbage collection.
* **Persistence Layer:** PostgreSQL 16 with Hibernate ORM, offering ACID compliance, custom check constraints, and optimized index structures.
* **Security Subsystem:** Spring Security 6 with stateless JWT filters, delegating password cryptography to strength-tuned BCrypt encoders.

---

## 5. Enterprise Database Design & Data Dictionary

### 5.1 Entity Relationship Model
* `users (1) ── (0..1) students`
* `users (1) ── (0..1) placement_officers`
* `students (1) ── (N) projects`
* `students (N) ── (M) skills` (Via `student_skills` bridge table)
* `students (1) ── (N) resumes`
* `students (1) ── (N) applications`
* `jobs (1) ── (N) applications`
* `applications (1) ── (N) interviews`
* `users (1) ── (N) notifications`

### 5.2 Enterprise Schema Definition (DDL Snippet)
```sql
CREATE TYPE user_role AS ENUM ('STUDENT', 'PLACEMENT_OFFICER', 'ADMIN');
CREATE TYPE job_status AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');
CREATE TYPE application_status AS ENUM ('APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'REJECTED', 'SELECTED', 'WITHDRAWN');

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE students (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    department VARCHAR(100) NOT NULL,
    graduation_year INT NOT NULL,
    cgpa NUMERIC(4,2) CHECK (cgpa >= 0.00 AND cgpa <= 10.00),
    phone VARCHAR(20),
    date_of_birth DATE
);

CREATE TABLE jobs (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    company_name VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    minimum_cgpa NUMERIC(4,2) CHECK (minimum_cgpa >= 0.00 AND minimum_cgpa <= 10.00),
    location VARCHAR(100) NOT NULL,
    salary_min NUMERIC(12,2) CHECK (salary_min >= 0),
    salary_max NUMERIC(12,2) CHECK (salary_max >= 0),
    deadline TIMESTAMPTZ NOT NULL,
    status job_status DEFAULT 'DRAFT' NOT NULL,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE applications (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    resume_id BIGINT NOT NULL,
    status application_status DEFAULT 'APPLIED' NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unique_student_job UNIQUE (student_id, job_id)
);
```

---

## 6. REST API Specification (OpenAPI 3.0 Compliant)

### 6.1 Core Endpoint Routing Table
| Method | Endpoint Route | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Public | Register student account with institutional email |
| `POST` | `/api/v1/auth/login` | Public | Authenticate credentials and return signed JWT access token |
| `GET` | `/api/v1/students/me` | Student | Retrieve authenticated student profile details |
| `PUT` | `/api/v1/students/me` | Student | Update student academic record and personal data |
| `GET` | `/api/v1/jobs` | Authenticated | List published jobs with pagination & filter parameters |
| `POST` | `/api/v1/jobs` | Officer / Admin | Create new corporate job opportunity draft |
| `POST` | `/api/v1/applications` | Student | Submit verified application for an open job posting |
| `PATCH` | `/api/v1/applications/{id}/status` | Officer / Admin | Advance or mutate applicant stage in pipeline |
| `PATCH` | `/api/v1/admin/users/{id}/activation` | Admin | Toggle user account activation status securely |

### 6.2 Standardized JSON Response Envelopes
* **Success Envelope (200 OK / 201 Created):**
  ```json
  {
    "timestamp": "2026-11-09T18:00:00Z",
    "status": 200,
    "success": true,
    "message": "Operation executed successfully",
    "data": {
      "applicationId": 1042,
      "status": "APPLIED"
    }
  }
  ```
* **Error Envelope (400 Bad Request / 409 Conflict):**
  ```json
  {
    "timestamp": "2026-11-09T18:00:00Z",
    "status": 409,
    "error": "Conflict",
    "code": "DUPLICATE_APPLICATION",
    "message": "Student has already submitted an active application for this job posting."
  }
  ```

---

## 7. UI/UX & Screen Architecture

* **Design Language:** Clean, high-contrast enterprise design system utilizing Tailwind CSS / Angular Material. Color palette anchored in slate-900 typography, corporate navy primary accents (`#0F172A`), and semantic status badges (Emerald for shortlisted, Amber for review, Rose for rejected).
* **Core View Inventory:**
  1. **Unified Authentication Portal:** Split-screen layout featuring institutional branding, secure login, and inline validation.
  2. **Student Command Center:** Real-time tracking of profile completion percentage, active job recommendations, and application status funnels.
  3. **Recruiter & Officer Hub:** High-density data tables with advanced column sorting, bulk status updates, and one-click interview scheduler modals.
  4. **System Administration Console:** Platform-wide telemetry, user audit logs, and account privilege overrides.

---

## 8. Enterprise Security Design & Compliance

* **Credential Hardening:** User passwords stored exclusively via salted BCrypt hashing (strength factor 12). Plaintext passwords are intercepted and rejected at DTO validation layers.
* **Stateless Authorization:** JSON Web Tokens (JWT) signed via HMAC-SHA256 using rotating environment secrets. Tokens embed immutable user IDs and role claims.
* **SQL Injection & CSRF Defense:** Parameterized queries enforced universally through Spring Data JPA repositories. CSRF safely disabled for stateless REST APIs utilizing secure Bearer tokens.
* **File Upload Guardrails:** Strict server-side validation ensuring only valid PDF resumes ($\le 5\text{MB}$) are processed. Files are sanitized, renamed with secure UUID storage keys, and saved outside web roots.

---

## 9. Business Logic Rules & Validation Matrix

| Rule ID | Enforcement Layer | Business Logic Condition |
| :--- | :--- | :--- |
| **BR-01** | Database & Service | User email addresses must be normalized to lowercase and maintain database uniqueness constraints. |
| **BR-02** | Service Layer | A student can only apply to jobs where `status = PUBLISHED` and current timestamp $\le$ job deadline. |
| **BR-03** | Database Unique Constraint | Composite key `(student_id, job_id)` prevents duplicate application submissions across the lifecycle. |
| **BR-04** | Service Layer | Selected resume verification: The referenced `resume_id` must belong strictly to the authenticated student. |
| **BR-05** | Service Layer | Immutable history: Resumes attached to active applications cannot be physically deleted; they are soft-archived. |

---

## 10. Testing Strategy & Quality Assurance

* **Unit Testing (JUnit 5 & Mockito):** Rigorous isolation testing verifying service-layer business rules, status transition state machines, and eligibility calculations.
* **Integration Testing (Spring Boot Test & Testcontainers):** End-to-end repository query validation using ephemeral PostgreSQL Docker containers to guarantee DDL integrity and constraint enforcement.
* **API Contract Testing:** Automated MockMvc controller tests validating HTTP status codes, JSON payload structures, and security filter chain rejections for unauthenticated actors.

---

## 11. Deployment, DevOps, and Operations

### 11.1 Production Environment Configuration (`.env.production`)
```env
SPRING_PROFILES_ACTIVE=prod
SERVER_PORT=8080
DB_URL=jdbc:postgresql://rds.campusflow.internal:5432/campusflow_prod
DB_USERNAME=prod_db_admin
DB_PASSWORD=${SECURE_DB_PASSWORD}
JWT_SECRET=${SECURE_JWT_MASTER_KEY}
JWT_ACCESS_TOKEN_MINUTES=15
FILE_STORAGE_PATH=/mnt/storage/secure-resumes
MAX_RESUME_SIZE_BYTES=5242880
APP_FRONTEND_URL=https://placement.campusflow.edu
```

### 11.2 CI/CD Pipeline & Release Checklist
1. Automated Git Guardian secret scans on pull requests.
2. Maven clean test execution with minimum 80% code coverage threshold.
3. Multi-stage Docker image build leveraging distroless Java 21 runtime baselines.
4. Zero-downtime rolling deployment managed via Kubernetes Ingress controllers and liveness/readiness probes.

---

## 12. Repository Structure and Git Workflow

```text
campusflow/
├── backend/
│   ├── src/main/java/com/campusflow/
│   │   ├── config/
│   │   ├── security/
│   │   ├── exception/
│   │   ├── auth/
│   │   ├── student/
│   │   ├── job/
│   │   ├── application/
│   │   ├── interview/
│   │   ├── notification/
│   │   └── admin/
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   └── db/migration/
│   └── pom.xml
├── frontend/
│   ├── src/app/
│   │   ├── core/
│   │   ├── shared/
│   │   ├── features/
│   │   └── layouts/
│   └── package.json
├── docs/
│   └── CampusFlow_Enterprise_Architecture_v2.0.md
├── .gitignore
├── .env.example
└── README.md
```

* **Git Branching Strategy:** GitFlow model utilizing `main` (production release branch), `develop` (integration branch), and short-lived `feature/*` branches for isolated development items.

---

## 13. Development Roadmap & Milestone Acceptance

* **Phase 0 – Architecture & Governance:** Complete documentation baseline, schema modeling, and threat modeling (Completed).
* **Phase 1 – Core Boilerplate & Infrastructure:** Spring Boot project initialization, PostgreSQL Docker compose setup, and Angular shell configuration.
* **Phase 2 – Security & Identity Engine:** Implementation of Spring Security, JWT authentication filters, and user registration endpoints.
* **Phase 3 – Student & Job Modules:** Full CRUD implementation for student profiles, resume uploads, and corporate job postings.
* **Phase 4 – Application Workflow & Interview Orchestration:** State machine enforcement for job applications, interview round scheduling, and notification dispatchers.
* **Phase 5 – Enterprise Hardening & Release:** End-to-end integration testing, performance optimization, and production container deployment.

---

## 14. Risks, Assumptions, and Mitigation Strategies

* **Risk:** Data corruption from concurrent multi-round application status updates.
  * *Mitigation:* Implement optimistic locking (`@Version`) on entity models and execute state changes within serialized database transactions.
* **Risk:** Resume storage bucket exhaustion or unauthorized file harvesting.
  * *Mitigation:* Enforce strict private bucket policies, generate non-predictable UUID storage keys, and validate user session ownership prior to streaming file bytes.
* **Assumption:** Participating recruiters and placement officers undergo internal institutional vetting before credential provisioning by system administrators.