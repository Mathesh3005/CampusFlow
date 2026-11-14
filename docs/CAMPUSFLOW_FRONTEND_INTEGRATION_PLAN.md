# CampusFlow Frontend Integration Plan

> Source-verified integration guide for the current repository. Backend claims below were checked against Java controllers, DTOs, services, security configuration, entities/repositories, and the master backend document. Only capabilities exposed by current controllers are listed as callable APIs. This document does not imply that planned functionality is implemented.

## 1. Backend architecture findings

The API is a Spring Boot 4.1.2 / Java 21 layered monolith under `backend/campusflow-api`: MVC controllers, request/response DTOs, services, Spring Data JPA repositories, entities/mappers, Spring Security resource-server JWT support, PostgreSQL/Flyway schema, and local filesystem resume storage. Services own state transitions, ownership checks, eligibility and notification side effects. Controllers expose versioned JSON APIs under `/api/v1`; resume upload is multipart. DTOs, rather than entities, define the wire contract.

Primary domain relationships: User has a Student or PlacementOfficer profile; an officer owns jobs; student owns resumes/projects; applications bind a student and job and may use a resume belonging to that same student; interviews belong to applications; notifications belong to users. `Role` values are `STUDENT`, `PLACEMENT_OFFICER`, and `ADMIN`; ADMIN has no implemented role-specific workflow. Skills, student skills, job skills and project skills exist in entity/schema layers but no controllers expose them.

Pagination endpoints return the project wrapper `PageResponseDto<T>`: `{content, page, size, totalElements, totalPages, first, last, hasNext, hasPrevious}`. Page indexing follows Spring Data (zero based). Defaults are size 20 and endpoint-specific sort noted below. List resumes is an unpaged array. Do not expect raw Spring `Page` JSON.

Enums used in the API include job status `DRAFT/PUBLISHED/CLOSED`, employment type and work mode (use Java enum source as canonical), application status `APPLIED/UNDER_REVIEW/SHORTLISTED/REJECTED/WITHDRAWN`, interview mode/status (`SCHEDULED/COMPLETED/CANCELLED` status), and notification types. Enum values are case-sensitive strings. Verify enum source before building fixed option lists.

## 2. Complete API inventory

All routes except `GET /api/v1/health` and auth register/login require a valid bearer token at the filter-chain level. Role requirements below are controller/method checks. Foreign IDs are additionally scoped to the authenticated profile/user for supported operations. Unless specified, successful object responses are JSON; domain/validation failures generally use Spring `ProblemDetail` JSON (`status`, `detail`, and standard problem fields). Authentication/filter failures can be produced before controller advice.

### Health and authentication

| Method and endpoint | Auth / role | Request | Response / validation / errors |
|---|---|---|---|
| `GET /api/v1/health` | Public | None | Health response from `HealthController`; no auth required. |
| `POST /api/v1/auth/register` | Public | `RegisterStudentRequest`: `{email,password,registerNumber,fullName,department,graduationYear}`. Email nonblank/email/max 255; password 8–72 chars; registerNumber max 30; fullName max 150; department max 100; graduationYear required 2020–2040. | `201 AuthResponse`: `{accessToken,tokenType,expiresAt,userId,email,role}`. Duplicate email is 409. Only student registration exists; register number duplication may fail at persistence constraint (not necessarily normalized into a consistent API error). |
| `POST /api/v1/auth/login` | Public | `LoginRequest`: `{email,password}`. Email nonblank, valid email, max 255; password nonblank. | `200 AuthResponse` same shape. Invalid credentials/disabled account are handled as authentication failures; invalid credentials detail is “Invalid email or password” (401). DTO validation yields 400. |

### Jobs

| Method and endpoint | Auth / role | Request / params | Response / rules / errors |
|---|---|---|---|
| `POST /api/v1/officer/jobs` | Bearer, `PLACEMENT_OFFICER` | `JobRequestDto`: required nonblank companyName/jobTitle/jobDescription; company/title max 150; optional location max 150; required employmentType/workMode; optional minimumCgpa 0–10; optional nonnegative salaryMin/salaryMax; required future applicationDeadline. | `201 JobResponseDto`, officer-owned DRAFT record. Validation 400; role/profile failures 403. |
| `GET /api/v1/officer/jobs` | Bearer, `PLACEMENT_OFFICER` | Pageable: `page`, `size`, `sort`; default page 0,size 20, `createdAt,desc`. Sort allowlist: companyName, jobTitle, location, applicationDeadline, createdAt, updatedAt. | Page wrapper of `JobResponseDto`; only current officer's jobs. Unsupported sort is 400. |
| `GET /api/v1/officer/jobs/{id}` | Bearer, `PLACEMENT_OFFICER` | Path id | Job DTO only if owned; otherwise not found/forbidden per scoped service behavior. |
| `PUT /api/v1/officer/jobs/{id}` | Bearer, `PLACEMENT_OFFICER` | Full JobRequestDto | Updated Job DTO; only owned job. Validation 400; state conflict 409; not found 404. |
| `PATCH /api/v1/officer/jobs/{id}/publish` | Bearer, `PLACEMENT_OFFICER` | No body | Job DTO; changes lifecycle and sends eligible student notifications. State conflict 409; not found 404. |
| `PATCH /api/v1/officer/jobs/{id}/close` | Bearer, `PLACEMENT_OFFICER` | No body | Job DTO; ownership/state rules enforced. |
| `DELETE /api/v1/officer/jobs/{id}` | Bearer, `PLACEMENT_OFFICER` | Path id | `204`; ownership/state and referential constraints apply. |
| `GET /api/v1/student/jobs` | Bearer, `STUDENT` | Optional `location`, `employmentType`, `workMode`; Pageable default page 0,size 20, `createdAt,desc`; job sort allowlist above. | Page of published jobs eligible by student CGPA. Filter values must match enums. A student without CGPA may not see jobs with a minimum. |
| `GET /api/v1/student/jobs/{id}` | Bearer, `STUDENT` | Path id | Published and CGPA-eligible Job DTO; unavailable/ineligible appears as not found. |

### Applications

| Method and endpoint | Auth / role | Request / params | Response / rules / errors |
|---|---|---|---|
| `POST /api/v1/student/applications` | Bearer, `STUDENT` | `{jobId, resumeId?, coverLetter?}`; jobId required positive; resumeId optional positive. | `201 ApplicationResponseDto`: `{id,studentId,jobId,resumeId,companyName,jobTitle,coverLetter,status,appliedAt,updatedAt}`. Service requires eligible/open job and student-owned resume when provided; duplicate student/job 409. |
| `GET /api/v1/student/applications` | Bearer, `STUDENT` | Pageable default page 0,size 20, `appliedAt,desc` | Page of own applications. |
| `GET /api/v1/student/applications/{id}` | Bearer, `STUDENT` | Path id | Own application DTO; not found 404. |
| `PATCH /api/v1/student/applications/{id}/withdraw` | Bearer, `STUDENT` | No body | Updated DTO; only allowed from valid current status; invalid transition 409. |
| `GET /api/v1/officer/applications` | Bearer, `PLACEMENT_OFFICER` | Pageable default page 0,size 20, `appliedAt,desc` | Page of applications for officer-owned jobs. |
| `GET /api/v1/officer/applications/{id}` | Bearer, `PLACEMENT_OFFICER` | Path id | Scoped application DTO. |
| `PATCH /api/v1/officer/applications/{id}/status` | Bearer, `PLACEMENT_OFFICER` | `{status}` required enum | Updated DTO; officer must own job, allowed transitions enforced; invalid transition 409, invalid DTO 400. |

### Resumes

Every resume route requires bearer + `STUDENT` and is scoped to current student.

| Method and endpoint | Request | Response / validation / errors |
|---|---|---|
| `POST /api/v1/student/resumes` | `multipart/form-data`, part named `file` | `201 ResumeResponseDto`: `{id,studentId,fileName,fileSize,contentType,isActive,uploadedAt}`. PDF MIME required; max configured size (master document/schema indicate 5 MiB). Empty/missing/wrong type 400; too large 413. Client should send actual PDF and avoid setting multipart Content-Type manually so browser supplies boundary. |
| `GET /api/v1/student/resumes` | None | JSON array of ResumeResponseDto. |
| `GET /api/v1/student/resumes/{id}` | Path id | Own ResumeResponseDto; 404 if absent/out of scope. |
| `PATCH /api/v1/student/resumes/{id}/activate` | No body | Resume DTO; activation behavior handled by service. |
| `PATCH /api/v1/student/resumes/{id}/deactivate` | No body | Resume DTO. |
| `DELETE /api/v1/student/resumes/{id}` | Path id | `204`; 409 if referenced by an application; deletion removes stored file via event/listener workflow. |

There is no resume download endpoint in the controller. Response DTO deliberately omits storage path, and clients must not build a path from metadata.

### Interviews

| Method and endpoint | Auth / role | Request / params | Response / rules / errors |
|---|---|---|---|
| `GET /api/v1/student/interviews` | Bearer, `STUDENT` | Pageable default page 0,size 20, `scheduledAt,asc` | Page of student's interviews. |
| `GET /api/v1/student/interviews/{id}` | Bearer, `STUDENT` | Path id | Own interview DTO. |
| `POST /api/v1/officer/interviews` | Bearer, `PLACEMENT_OFFICER` | `{applicationId,scheduledAt,interviewMode,locationOrLink,notes?}`; applicationId positive, scheduledAt required future, mode required, locationOrLink nonblank max 500. | `201 InterviewResponseDto`: `{id,applicationId,scheduledAt,interviewMode,locationOrLink,status,notes,createdAt,updatedAt}`. Application must belong to officer and be SHORTLISTED; invalid operation 409; absent 404. |
| `GET /api/v1/officer/interviews` | Bearer, `PLACEMENT_OFFICER` | Pageable default page 0,size 20, `scheduledAt,asc` | Page of interviews for officer-owned jobs. |
| `GET /api/v1/officer/interviews/{id}` | Bearer, `PLACEMENT_OFFICER` | Path id | Scoped interview DTO. |
| `PUT /api/v1/officer/interviews/{id}` | Bearer, `PLACEMENT_OFFICER` | Full update `{scheduledAt,interviewMode,locationOrLink,notes?}`; same constraints as create | Interview DTO; only scheduled interviews can update; changed schedule notifies student. Invalid operation 409, malformed 400. |
| `PATCH /api/v1/officer/interviews/{id}/status` | Bearer, `PLACEMENT_OFFICER` | `{status}` required | Status may transition from SCHEDULED to COMPLETED or CANCELLED only. Cancel notifies student; invalid transition 409. |
| `DELETE /api/v1/officer/interviews/{id}` | Bearer, `PLACEMENT_OFFICER` | Path id | `204`, scoped to owner. |

### Notifications

Student routes use `/api/v1/student/notifications`; officer routes use `/api/v1/officer/notifications`. Both require bearer and matching role; all operations are scoped to JWT user ID. `NotificationResponseDto` is `{id,userId,title,message,notificationType,isRead,createdAt}`.

| Method and endpoint suffix | Request | Response / errors |
|---|---|---|
| `GET {base}` | Pageable default page 0,size 20, `createdAt,desc` | Page wrapper of notifications. |
| `GET {base}/{id}` | Path id | Notification DTO; 404 outside inbox/not found. |
| `PATCH {base}/{id}/read` | No body | Updated notification DTO. |
| `PATCH {base}/read-all` | No body | `204`. |
| `DELETE {base}/{id}` | Path id | `204`. |

Notifications are generated for job publish to eligible students, application submission to job owner, application status changes to student, and interview schedule/update/cancel to student. There is no unread-count endpoint, push channel, or notification creation endpoint exposed for general client use.

## 3. Authentication flow

1. Register via `POST /api/v1/auth/register` or login via `POST /api/v1/auth/login`.
2. Store the returned `accessToken` only in a security-conscious in-memory approach where practical. Response has `tokenType: "Bearer"`, `expiresAt` (UTC instant), `userId`, `email`, and `role`.
3. Send `Authorization: Bearer <accessToken>` on protected requests.
4. Token is HS256, issuer `campusflow-api`, subject is user ID string, issued-at and expiry claims; TTL is exactly 15 minutes. JWT also contains `email` and `role` claims. No refresh endpoint, refresh token, logout/revocation API, or authenticated `/me` endpoint exists.
5. The role appears in response as uppercase string, and token role claim is converted to Spring `ROLE_<role>`. UI can use response role for navigation, but server remains authority. Do not treat decoded client claims as proof of authorization.
6. Student registration creates only STUDENT accounts. Placement officer accounts must be provisioned outside the public API; login accepts credentials for them if present. ADMIN is not a usable frontend role in current endpoints.

## 4. Role-based authorization mapping

| Frontend role | API access and viable screens |
|---|---|
| Anonymous | Health, register, login. |
| STUDENT | Job discovery/detail; application submission/history/detail/withdrawal; resume list/upload/activate/deactivate/delete; interview list/detail; notification inbox/read/delete. |
| PLACEMENT_OFFICER | Owned job management and lifecycle; applications for owned jobs and status review; interviews for owned applications; notification inbox/read/delete. Requires pre-provisioned account. |
| ADMIN | No implemented admin API or admin screen can be backed by this repository. |

Route guards improve navigation only. Every API request must still handle 401 (expired/invalid/missing bearer) and 403 (wrong role/denied); ownership checks can also return not-found to avoid exposing foreign data.

## 5. Frontend module and screen mapping

| Feature area | Angular screens/components | API |
|---|---|---|
| Auth | Login, student registration | `/auth/login`, `/auth/register` |
| Student home/jobs | Dashboard, job list/filter/sort/pagination, job details, application form | `/student/jobs`, `/student/applications`, `/student/resumes` |
| Student applications | My applications, application detail, withdraw confirmation | `/student/applications` |
| Student resumes | Resume list/upload/activate/deactivate/delete | `/student/resumes` |
| Student interviews | Interview list/detail/calendar view | `/student/interviews` |
| Student notifications | Inbox, notification detail/read/read-all/delete | `/student/notifications` |
| Officer jobs | Owned jobs list, create/edit, publish/close/delete | `/officer/jobs` |
| Officer applicants | Application list/detail, status transition action | `/officer/applications` |
| Officer interviews | Interview list/detail, schedule/reschedule, complete/cancel/delete | `/officer/interviews` |
| Officer notifications | Inbox and read/delete actions | `/officer/notifications` |
| Not available | Profile CRUD, skill/project editing, resume download, unread count, admin screens, password reset, officer onboarding | No exposed controller endpoint |

## 6. Angular architecture recommendation

The frontend is currently a standalone Angular 22 app with Material/CDK dependencies, Router, Forms, SSR/hydration, and a login component; current routing has only `/login` and redirects unknown paths there. Extend the existing standalone setup instead of introducing NgModules solely as feature containers.

Suggested structure:

```text
src/app/
  core/                 api-client config, auth, interceptors, guards, error handling
  shared/               reusable toolbar, page shell, loading/empty/error, pagination, dialogs
  features/
    auth/                login, register
    student/jobs/        list, detail, apply
    student/applications/
    student/resumes/
    student/interviews/
    student/notifications/
    officer/jobs/
    officer/applications/
    officer/interviews/
    officer/notifications/
  models/                DTO interfaces and enums aligned to backend
```

Use lazy standalone route groups (`loadChildren` with route arrays, or lazy `loadComponent` per screen), nested student/officer shells, and `canActivate`/`canMatch` role guards. Keep a single API base URL in environment/runtime config. Provide typed domain services (AuthService, JobsService, ApplicationsService, ResumesService, InterviewsService, NotificationsService) around `HttpClient`; keep components focused on view state.

Use Reactive Forms for login/registration and job/application/interview forms. Mirror backend constraints for quick feedback but always display server validation responses. Angular Material form field, input, select, datepicker, table, paginator, dialog, snackbar, toolbar and navigation components suit the flows. Use shared page/error/loading/empty states. Represent backend enums as string unions; timestamps as ISO-8601 strings and parse/display in local timezone without dropping offsets.

## 7. API integration strategy

- Configure `provideHttpClient(withInterceptors([...]))` and a functional bearer interceptor. Add Authorization only for a locally available token; do not attach a token to unrelated origins.
- Centralize 401 behavior (clear auth state and route to login); distinguish 403, 404, 409, 413 and 400 for user messaging. Never blindly retry writes after 401/409.
- Build pagination query params with zero-based `page`, `size`, and Spring sort format, e.g. `sort=createdAt,desc`; support repeated sort parameters if needed. Consume `content` and page metadata explicitly.
- Send ISO 8601 offset timestamps for applicationDeadline and scheduledAt. Respect enum spellings and validate future dates client-side.
- Upload resume with `FormData` key `file`; do not manually set `Content-Type`.
- Treat `ProblemDetail.detail` as optional server text; use a fallback when absent. Avoid assuming a field-error map: the current advice mostly returns one general detail string.
- Angular SSR/hydration is enabled. Browser storage APIs are unavailable on the server. Keep token access behind a browser-safe abstraction and prevent SSR from attempting protected calls before a client session exists. Prefer in-memory access-token handling or, if persistence is needed, formally assess XSS exposure; backend currently cannot issue HttpOnly-cookie auth itself.
- Backend CORS settings are not evident in the inspected application configuration; development proxy or explicitly configured allowed origins may be needed. Confirm deployment origin/CORS before browser integration.

## 8. Security considerations

The API is stateless; BCrypt protects stored passwords, JWT uses HS256 and a server-only Base64 HMAC secret of at least 32 decoded bytes, and method security plus scoped repository queries enforce roles/ownership. Keep the secret exclusively server-side. Use HTTPS in deployment. Minimize token persistence in localStorage because XSS can exfiltrate it; never put tokens in URLs/logs. Validate role for navigation but trust server responses only. Do not expose resume filesystem paths. Keep upload controls to PDF and configured byte limit, while understanding client MIME checks are not security controls. Expiry is short (15 min), so the current UX must send users back through login on expiration; no refresh flow exists.

## 9. Missing backend capabilities and frontend limitations

Implemented and directly consumable: authentication, jobs, applications, resumes (except download), interviews, notifications. The following are absent from current controller/API source, even if tables, entities, services, or master documentation discuss them:

- No student/officer profile read/update endpoint, no authenticated user `/me`, and no officer registration/provisioning endpoint.
- No skills, student skills, project, project skills, or job skills CRUD/search controllers.
- No resume file download endpoint; metadata response excludes storage path.
- No notification unread count endpoint, bulk delete, push/WebSocket delivery, or client notification creation.
- No password reset/change, refresh token, logout/revocation, email verification, or account recovery API.
- No admin API, analytics/dashboard aggregate endpoints, employer/company accounts, or job skill filters.
- No application officer-side resume retrieval/download endpoint or dedicated student profile details in application DTO.
- No explicit sorting allowlist on every pageable controller, and exception advice scope varies; parse errors consistently rather than assuming uniform error bodies.

Frontend should not fake data for these as if it were persisted server capability. Expose unavailable workflow only as a clearly inactive placeholder or omit it until backend endpoints are added.

## 10. Recommended implementation sequence

1. Define TypeScript DTO/enums and shared API base URL/error/pagination models from this contract.
2. Implement AuthService, login/register Reactive Forms, bearer interceptor, SSR-safe token abstraction, and role guards; handle 401/403/409.
3. Build role shells and lazy route groups; account for officer login without public officer signup.
4. Implement student job browsing/detail/filter/pagination, then application submission/history/withdrawal.
5. Implement resume upload/list/activation/deactivation/deletion and application resume selection; communicate the lack of download.
6. Implement officer job CRUD and publish/close lifecycle, then application review/status workflow.
7. Implement interview scheduling/update/status and student interview views.
8. Implement notification inbox/read/read-all/delete for each role.
9. Align UI limits and enum choices to DTO/source and verify the actual backend origin/CORS and API contracts in integration environment before relying on them.

## Source areas reviewed

`controller/*Controller.java`, `controller/*ExceptionHandler.java`, `config/SecurityConfig.java`, `security/*`, relevant `service/*`, `dto/auth`, `dto/job`, `dto/application`, `dto/resume`, `dto/interview`, `dto/notification`, `entity/*`, `repository/*`, `mapper/*`, `dto/common/PageResponseDto.java`, `application.properties`, `pom.xml`, Flyway V1 migration, `docs/CAMPUSFLOW_BACKEND_MASTER_DOCUMENT.md`, and current Angular package/routing/config files.
