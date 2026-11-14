# CampusFlow — GitHub Copilot Instructions

## 1. Project Identity

Project Name: CampusFlow

Description: College Placement Management System.

CampusFlow is a full-stack web application designed to manage college placement activities, including student management, job opportunities, applications, resumes, interviews and notifications.

The system has three roles:

- STUDENT
- PLACEMENT_OFFICER
- ADMIN

Currently, the implemented frontend workflows primarily support STUDENT and PLACEMENT_OFFICER.

Do not invent ADMIN functionality.

## 2. Technology Stack

### Backend
- Java 21
- Spring Boot 4.1.2
- Spring Security
- Spring Data JPA
- Hibernate
- PostgreSQL 18.6
- Flyway
- Maven Wrapper 3.10.0
- JWT HS256
- BCrypt
- JUnit 5
- Mockito
- Testcontainers

### Frontend
- Angular 22
- TypeScript
- Angular Material 22
- SCSS
- Standalone Components
- Angular Router
- Reactive Forms
- RxJS
- Angular SSR and hydration

## 3. Repository Structure

Repository root:

D:\Campusflow

Backend:

backend/campusflow-api/

Frontend:

frontend/

Documentation:

docs/

Git repository:

- Root repository: D:\Campusflow
- Branch: main
- Remote: origin

IMPORTANT:
The backend directory previously contained a separate nested Git repository.

Always inspect Git root before Git operations.

Never commit or push unless explicitly instructed.

Never use `git add .`.

Never stage build-errors.txt without explicit permission.

## 4. Architecture Rules

### Backend

Use a layered modular monolith architecture.

Follow the existing separation:

- Controllers
- Services
- Repositories
- Entities
- DTOs
- Configuration
- Exception handling

Controllers must not contain business logic.

Business rules belong in services.

Database access belongs in repositories.

Use DTOs for API request and response contracts.

Database schema changes must use forward-only Flyway migrations.

Never modify an existing migration that has already been applied.

### Frontend

Use:

- Standalone Angular components.
- Lazy-loaded feature routes.
- Feature-based architecture.
- Strong TypeScript typing.
- Reusable shared components.
- Angular Material where appropriate.
- Reactive Forms for complex forms.
- Existing centralized API error handling.
- Existing authentication state.

Do not duplicate services or authentication state.

Follow the established folder structure.

## 5. Authentication and Security

Authentication uses JWT HS256.

Token lifetime: 15 minutes.

The token is maintained in the existing in-memory AuthStateStore.

Do not introduce localStorage or sessionStorage for JWT persistence.

The existing functional HTTP interceptor attaches bearer tokens only to configured CampusFlow API requests.

Do not bypass the interceptor.

Do not create fake authentication functionality.

The following backend capabilities do not currently exist:

- Refresh token API
- Logout/revocation API
- Password reset API
- Email verification API
- /me API

Do not invent these endpoints.

Frontend guards provide navigation protection only.

Backend authorization remains authoritative.

Role restrictions:

- STUDENT accesses student routes.
- PLACEMENT_OFFICER accesses officer routes.
- Unsupported roles must be handled safely.

## 6. API Integration Rules

Backend API base path:

/api/v1

Before implementing any API integration:

1. Inspect the actual backend controller.
2. Inspect request and response DTOs.
3. Inspect the service business rules.
4. Inspect security annotations.
5. Inspect repository query behavior.
6. Confirm pagination and sorting.
7. Confirm error responses.

Never assume an API exists because it would be useful.

Never invent response fields.

Never fabricate dashboard statistics.

Respect backend pagination.

Use the existing environment configuration and API services.

Handle Spring ProblemDetail responses through the existing centralized error handling.

## 7. Database Rules

Primary database: PostgreSQL.

Database name used during development:

campusflow_db

Important tables include:

- users
- students
- placement_officers
- jobs
- applications
- skills
- student_skills
- projects
- project_skills
- resumes
- interviews

Never expose database credentials.

Never commit application secrets.

Never put real student data into source control.

## 8. Existing Backend Capabilities

Implemented backend modules:

- Student registration and login
- JWT authentication
- Resume management
- Job management
- Application management
- Interview management
- Notification management
- Pagination
- Role-based authorization

Important backend limitations:

- No ADMIN workflow.
- No public placement officer registration.
- No resume binary download endpoint.
- No student-facing profile/CGPA endpoint.
- No student-facing job skills endpoint.
- No refresh token workflow.
- No password reset.
- No aggregate dashboard endpoint.
- No automatic job deadline scheduler.
- No email, push or WebSocket notifications.

Never claim these capabilities exist.

## 9. Existing Frontend Progress

### Phase 1 — API Foundation and Authentication

Completed:

- TypeScript API models
- Environment-specific API configuration
- AuthService
- In-memory JWT session management
- Token expiration handling
- Functional HTTP interceptor
- Centralized error handling
- Login page integration
- SSR-safe browser interactions

### Phase 2A — Routing and Layout

Completed:

- Authentication guards
- Role-based guards
- Lazy-loaded student routes
- Lazy-loaded officer routes
- Shared responsive workspace layout
- Role-specific navigation
- Access-denied page
- Safe post-login return URL handling

### Phase 2B — Student Dashboard

Completed:

- Student overview cards
- Recent applications
- Available jobs
- Upcoming interviews
- Recent notifications
- Parallel API requests
- Independent section error handling
- Pagination-aware interview retrieval
- UTC labels
- Responsive mobile navigation

Dashboard metrics must come from actual backend API responses.

### Phase 2C Stage 1 — Jobs Module

Completed:

- Job listing
- Server-side pagination
- Location filter
- Employment type filter
- Work mode filter
- Debounced location filtering
- Job details
- Invalid job ID validation
- Backend eligibility handling

Supported job filters:

- location
- employmentType
- workMode

Do not invent skill filters.

### Phase 2C Stage 2 — Application Submission

Implemented:

- Resume listing integration
- Resume active-property mapping
- Multiple active resume support
- Explicit resume selection
- Optional resume attachment
- Optional cover letter
- Application submission
- Duplicate submission protection
- Application confirmation
- Application detail page

Important:
Backend ResumeResponse returns `active`.

The frontend normalizes this to `isActive`.

Application submission:

POST /api/v1/student/applications

Request:

{
  "jobId": 123,
  "resumeId": 45,
  "coverLetter": "Optional text"
}

resumeId and coverLetter are optional.

Backend independently validates job eligibility, publication status, deadline and duplicate applications.

### Phase 2C Stage 3 — Student Applications Management

Completed:

- Paginated application history
- Application details navigation and status display
- Withdrawal confirmation for `APPLIED`, `UNDER_REVIEW`, and `SHORTLISTED`
- Refresh after withdrawal and status-specific error handling

### Phase 2C Stage 4 — Student Resume Management

Completed:

- Resume listing with metadata and backend `active` to frontend `isActive` mapping
- PDF upload with client MIME/size checks and backend signature validation
- Activate/deactivate while allowing multiple active resumes
- Permanent deletion confirmation and handling for resumes linked to applications
- Loading, empty, success, validation, network, and API error states

There is no resume binary download endpoint. A resume referenced by any application, including a withdrawn application, cannot be deleted. Do not implement preview or download behavior.

## 10. Current Pending Work

Priority order:

1. Student Notifications
2. Student Interviews
3. Placement Officer Dashboard
4. Placement Officer Jobs Management
5. Placement Officer Application Management
6. Placement Officer Interview Management
7. Final integration testing

Do not skip ahead without approval.

## 11. UI/UX Design System

CampusFlow visual identity:

Primary blue: #2563eb

Background: #f8fafc

Surface: #ffffff

Typography: Roboto

Design principles:

- Professional SaaS dashboard.
- Clean layouts.
- Consistent spacing.
- Strong visual hierarchy.
- Responsive design.
- Accessible forms and controls.
- Consistent status indicators.
- Subtle shadows.
- Consistent border radii.
- Avoid excessive gradients.
- Avoid unnecessary animations.
- Avoid cluttered dashboards.

All new pages must integrate with the existing workspace layout.

Do not redesign existing shared navigation without permission.

## 12. Error Handling

Every API-driven feature must handle:

- Loading
- Success
- Empty
- Error
- Retry where appropriate

Handle HTTP status codes according to actual backend behavior.

Never display raw stack traces.

Never silently convert failed requests into fake successful responses.

## 13. SSR and Hydration

Angular SSR and hydration are enabled.

All new functionality must be SSR-safe.

Avoid unguarded access to:

- window
- document
- localStorage
- sessionStorage
- browser-only APIs

Be careful with dates and timezone formatting.

Avoid server/client hydration mismatches.

The current in-memory authentication design means authenticated sessions cannot be restored on a fresh SSR request. Do not introduce persistent JWT storage to work around this limitation.

## 14. Testing Requirements

For every meaningful implementation:

- Add service tests.
- Add component tests.
- Test success states.
- Test error states.
- Test empty states.
- Test pagination where relevant.
- Test invalid input.
- Test authorization-related navigation.

Run the complete Angular test suite after logical implementation groups.

Run the production build before reporting completion.

Never claim tests passed without actually running them.

## 15. Documentation

Maintain:

docs/CAMPUSFLOW_BACKEND_MASTER_DOCUMENT.md

docs/CAMPUSFLOW_FRONTEND_INTEGRATION_PLAN.md

docs/CAMPUSFLOW_FRONTEND_ARCHITECTURE.md

Update documentation when architecture, API integration or business workflows materially change.

Do not rewrite complete documentation unnecessarily.

## 16. Development Workflow

Before modifying files:

1. Inspect relevant existing implementation.
2. Understand the current architecture.
3. Verify backend contracts.
4. Identify the minimum files requiring changes.
5. Explain the proposed approach when the task is architectural.

During implementation:

- Keep changes scoped.
- Reuse existing services and models.
- Avoid unnecessary dependencies.
- Avoid unrelated refactoring.
- Preserve working functionality.
- Do not duplicate existing features.

After implementation:

1. Run relevant tests.
2. Run complete Angular tests.
3. Run production build.
4. Review changed files.
5. Report remaining limitations.

## 17. Git Restrictions

Never commit automatically.

Never push automatically.

Never create branches without permission.

Never run destructive Git commands.

Never use `git add .`.

Always show the user what files changed.

Only perform Git operations when explicitly requested.

## 18. Communication Rules

When working on CampusFlow:

- Be technically precise.
- Explain important architectural decisions.
- Do not invent functionality.
- Do not hide limitations.
- Prefer small implementation tasks.
- Avoid repeatedly scanning the entire repository.
- Do not make broad changes without approval.
- Ask before changing backend contracts.
- Report exact test results.
- Keep the user informed about implementation progress.

The objective is a production-quality, maintainable College Placement Management System.

Correctness, security, maintainability and real backend integration take priority over implementation speed.