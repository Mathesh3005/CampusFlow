# CampusFlow Frontend Architecture

## Scope

Phase 1 establishes typed API contracts and the authentication transport/session foundation. The existing standalone Angular 22 app, Material theme, SSR and hydration remain in use. No backend code or dependencies were changed.

## Folder structure

```text
src/app/
  core/
    auth/       AuthService and in-memory AuthStateStore
    http/       API interceptor and ProblemDetail-aware error conversion
    models/     Auth, domain DTO, pagination and API error types
  features/auth/pages/login/  Existing login screen, now connected to login API
src/environments/
  environment.ts              Production/default API base
  environment.development.ts  Local development API base
```

Student-facing job discovery, application submission/history/withdrawal, and resume-management workflows use typed feature services and pages. Student interview and notification management and the placement-officer workflows remain deferred; the dashboard has its own read-only aggregation service for bounded overview requests.

## API configuration

`environment.apiBaseUrl` is the single API root. The default/production configuration uses the same-origin `/api/v1` path. Angular's development configuration replaces it with `http://localhost:8080/api/v1`; change this development environment value to match the local backend address. Services append resource paths to this base and do not embed hostnames.

## TypeScript models

`core/models/auth.models.ts` mirrors `LoginRequest`, `RegisterStudentRequest` and `AuthResponse`, including the backend's `accessToken`, `tokenType`, ISO `expiresAt`, `userId`, `email` and role string. `domain.models.ts` defines response/request contracts for jobs and applications, response contracts for resumes/interviews/notifications, exact Java enum spellings, and the `PageResponse<T>` wrapper fields. Java `Long` IDs and sizes use TypeScript `number`; Java `BigDecimal` values also use `number`; temporal DTO values use ISO timestamp strings. `api-error.model.ts` models Spring ProblemDetail standard fields while retaining extension fields as `unknown`.

## AuthService and session state

`AuthService` exposes `login(LoginRequest)` and `registerStudent(RegisterStudentRequest)`, posting to the implemented `/auth/login` and `/auth/register` routes. Both accept the actual `AuthResponse`, then update `AuthStateStore`. The store keeps the token only in memory and exposes signal-based `user` and `isAuthenticated` state. It checks `expiresAt` before reporting a valid session and clears expired state. Page refresh intentionally loses the token; the backend offers no refresh/revocation endpoint. There is no fabricated logout API.

The existing login screen submits the real login form and routes successful sessions into the role-appropriate workspace. Student dashboard data loading is documented in the Phase 2B section below.

## HTTP interceptor

`apiInterceptor` attaches `Authorization: Bearer ...` only when the request origin matches the configured API origin. It leaves unrelated external requests untouched. On HTTP 401 it clears the in-memory session and raises a normalized `ApiError`. `provideHttpClient(withInterceptors(...))` is registered in the standalone application config. The interceptor uses no browser storage; its origin helper checks for `window` and has a server fallback for SSR.

## Error handling

`toApiError` retains the original ProblemDetail object and classifies status codes: 400 validation, 401 unauthorized, 403 forbidden, 404 not found, 409 conflict, 413 too large, 500+ server, and other. It uses `detail`, then `title`, then a status fallback as the user-facing message. Backend advice does not consistently include field-level validation maps, so consumers should not assume them. Login displays the returned safe message and keeps the form available for retry.

## SSR considerations

The app's existing `provideClientHydration`, server rendering configuration and server entry remain unchanged. No `localStorage` or `sessionStorage` is accessed. Authenticated calls during SSR have no in-memory browser session and therefore no bearer token; protected page data loading should be deferred to client-side authenticated flows or designed explicitly with a server session later.

## Build verification

`npm run build` completed successfully on 2026-11-14. The first sandboxed attempt could not fetch the existing Google Roboto font for Angular's production font inlining; rerunning the same production build with network access succeeded. Angular generated browser and server bundles and prerendered the existing static route. No theme or build optimization settings were changed.

## Remaining implementation tasks

- Implement student interview and notification management, plus the placement-officer workflows.
- Add a student registration UI and ensure its controls mirror backend validation.
- No `/me`, refresh, logout/revocation or password recovery API exists today.
- Verify configured API origin and CORS/proxy behavior in the target deployment environment.
- Preserve the in-memory auth limitation: protected SSR requests have no browser session and require a later client login.

## Phase 2B: Student Dashboard

The student dashboard is a lazy component at `/student/dashboard` inside the existing role-guarded student workspace. It reuses the root `AuthStateStore` for the signed-in email and the existing API interceptor/error normalization; it does not duplicate session state or add an aggregate endpoint.

### Student APIs consumed

All requests are GETs under the configured API base and are authorized by the backend with `hasRole('STUDENT')`. The controllers scope results to the authenticated student.

| Endpoint | Requested page | Dashboard use |
|---|---|---|
| `/student/applications` | `page=0`, `size=5`, `sort=appliedAt,desc` | Recent applications and authoritative `totalElements` application metric. DTO supplies job title, company, status and `appliedAt`. |
| `/student/jobs` | `page=0`, `size=4`, `sort=createdAt,desc` | Available eligible published jobs and `totalElements` count. Backend applies student CGPA eligibility. DTO supplies title, company, employment type, location and deadline. |
| `/student/interviews` | `page=0`, `size=20`, `sort=scheduledAt,desc` | Bounded interview sample; UI filters future `SCHEDULED` entries and sorts nearest first. DTO supplies application ID, time, status, mode and location/link. |
| `/student/notifications` | `page=0`, `size=5`, `sort=createdAt,desc` | Recent notification titles/messages, read state and creation date. |

Each response uses the shared `PageResponse<T>` contract. Four requests run in parallel. Each endpoint converts its own failure into a section error so successful panels remain visible. The dashboard does not request resumes because no dashboard information needs them. There is no unread-count endpoint, so no unread total is shown.

### Components and data flow

`StudentDashboardService` owns the four typed bounded GET requests and partial failure results. `StudentDashboard` starts loading on initialization, uses `takeUntilDestroyed`, and exposes successful response pages to reusable `OverviewStatCard`, `RecentApplications`, `AvailableJobs`, `UpcomingInterviews`, and `RecentNotifications` standalone components. Each panel handles loading, its own error, empty state and populated state. A refresh control reloads all sections. The page displays only the authenticated session email; its current date is formatted with an explicit UTC timezone for consistent SSR/client rendering.

### Limitations

- Interview DTOs include `applicationId` but no related job title or company, so the dashboard displays “Application #…” rather than inventing job details.
- The interview endpoint has no status/date filter. The dashboard reads only the latest 20 scheduled-time records, then filters future scheduled interviews locally; if a student has more than 20 relevant records, a future item may be outside this preview. The full interviews page can paginate the API.
- Unread notifications are identified per displayed item only. An accurate unread total requires a backend count endpoint or fetching all notification pages, neither of which is done here.
- Overview application/job totals come from API `totalElements`, not client-side counts of the preview rows.
- At the end of Phase 2B, other feature panels were placeholders. Subsequent Student Jobs, Student Applications Management, and Student Resume Management sections document the workflows added after that phase.

## Student Jobs Module — Stage 1

The student jobs feature is lazy-loaded inside the existing role-guarded `/student` workspace. It contains a paginated jobs list at `/student/jobs` and a dedicated detail page at `/student/jobs/:id`. The module is read-only: application submission and placement-officer job management are outside this stage.

### Backend endpoints consumed

Both endpoints require a JWT-authenticated `STUDENT` role. The server derives the student profile from the authenticated JWT subject.

| Endpoint | Request | Response/use |
|---|---|---|
| `GET /student/jobs` | `page`, `size`, `sort`; optional `location`, `employmentType`, `workMode` | `PageResponse<JobResponse>` with only `PUBLISHED` jobs eligible for the student CGPA. The default sort is `createdAt,desc`; requested sort fields must be one of `companyName`, `jobTitle`, `location`, `applicationDeadline`, `createdAt`, or `updatedAt`. |
| `GET /student/jobs/{id}` | Path `id` | `JobResponse` for a published, CGPA-eligible job. A missing, unpublished, or ineligible job maps to HTTP 404. |

Only the backend-supported filters are presented: location substring, employment type (`FULL_TIME` or `INTERNSHIP`), and work mode (`ONSITE`, `REMOTE`, or `HYBRID`). There is no job-title search parameter or skills filter. The backend applies location matching case-insensitively and applies CGPA eligibility on both listing and detail retrieval. Jobs without a minimum CGPA are eligible; jobs with a minimum require the student's CGPA to meet it.

### Components and data flow

`StudentJobsService` centralizes the configured API base URL and provides typed list/detail requests using the shared `JobResponse` and `PageResponse<T>` DTO models. `StudentJobsList` sends server pagination and supported filter parameters, debounces location changes, resets to page zero when filters change, cancels stale requests, and renders loading, error, empty, results, refresh, clear-filter and pagination states. `StudentJobDetails` validates the route ID before calling the detail endpoint and distinguishes invalid IDs, HTTP 404 (including ineligibility), other API failures, and a successful DTO. Neither page duplicates authentication or API error normalization.

The list and detail pages render DTO-provided title, company, location, employment type, work mode, deadline, status, description, CGPA threshold, and available salary bounds. Salary currency and required skills are not present in the job DTO and are not fabricated. Deadlines are displayed in UTC with an explicit label.

## Phase 2C: Student application workflow

The job detail page now loads the signed-in student's resumes and provides an application form. `StudentResumesService` calls `GET /student/resumes`; the backend DTO field is `active`, which the service maps into the UI model's `isActive` property. Resume rows show the filename, size, upload date, and active state. A student can explicitly choose any active resume; multiple active resumes are supported. Resume attachment is optional, and no upload or binary download behavior is implemented here.

`StudentApplicationsService` calls `POST /student/applications` with the existing typed `ApplicationRequest` and handles the returned `ApplicationResponse`. The job detail component includes the job ID, an explicitly selected resume ID only when selected, and a nonblank optional cover letter. It prevents repeated submission while pending and displays the returned application ID/status on success. The success link opens `/student/applications/:id`, a lazy component backed by `GET /student/applications/{id}`.

The backend independently checks that the job is published, the deadline has not passed, the student meets the job's minimum CGPA, the student has not already applied, and any supplied resume belongs to that student. The UI displays the job's minimum CGPA and explains that the server's checks are authoritative; there is no student profile/CGPA endpoint for a client-side comparison. Known `400`, `401`, `403`, `404`, `409`, and `500` application failures receive user-facing messages. Duplicate application, expired deadline, and closed-job conflicts use the backend ProblemDetail detail to provide specific guidance without displaying raw exception traces.

### Application workflow limitations

- Backend submission permits no resume and accepts any owned resume ID whether active or inactive. The form offers only active resumes and makes the attachment optional, but this UI policy is not enforced by the backend.
- The backend does not enforce a single active resume; the UI handles multiple active entries by requiring the student to select one explicitly.
- A student CGPA endpoint and job required-skills endpoint/field are not implemented. Eligibility is enforced by backend job filtering/details and again at submission.
- Resume binary download remains unsupported; PDF upload is provided separately by Student Resume Management.
- Student application status changes remain officer-owned; students can view their current status but cannot change it directly.

## Student Applications Management

The student application list route `/student/applications` is a lazy standalone page inside the existing student role-guarded workspace. `StudentApplicationsService` loads history from `GET /student/applications` with zero-based `page`, `size=20`, and the backend-supported default ordering `sort=appliedAt,desc`. No status filters or client-side filtering are added. The page renders job title, company, status, applied date, server pagination, and links to the existing `/student/applications/:id` detail page.

The page offers withdrawal only for `APPLIED`, `UNDER_REVIEW`, and `SHORTLISTED` applications. It asks for confirmation before calling `PATCH /student/applications/{id}/withdraw`; successful responses show confirmation feedback and trigger a fresh request for the current page. A backend `404` or `409` displays a status-specific message and refreshes the list because the record may have changed; `401` informs the student that the session expired and provides a sign-in link. Loading, empty, retryable list error, success, and withdrawal error states use the existing API interceptor/error normalization and the workspace visual conventions.

## Phase 2C Stage 4: Student Resume Management

The role-guarded `/student/resumes` route now loads a standalone resume-management page using the existing `StudentResumesService` and `StudentResume` model. The service supports `GET /student/resumes`, `POST /student/resumes`, `PATCH /student/resumes/{id}/activate`, `PATCH /student/resumes/{id}/deactivate`, and `DELETE /student/resumes/{id}`. Resume DTOs continue to normalize backend `active` into frontend `isActive`.

The page lists filename, size, upload date, and active state; students can activate/deactivate resumes independently, so multiple active resumes remain supported. PDF uploads use `FormData` with the `file` field and leave multipart `Content-Type` to the browser. The client checks MIME type and the 5 MiB limit, while the backend independently validates the PDF signature. Successful uploads refresh the list; successful status changes update the affected item; successful deletions remove the item only after the backend confirms deletion. Delete requires confirmation and explains that deletion is permanent.

The backend rejects deletion when any application references the resume, including withdrawn applications. A `409` response leaves the resume in the list and explains the restriction. Other API failures are presented as safe, status-specific messages, including network, authentication, authorization, upload-size, and storage failures. There is no resume binary download endpoint, so the page does not offer preview, view, or download actions.

## Phase 3 Stage 1: Placement Officer Jobs List

The officer workspace route `/officer/jobs` now renders a standalone, OnPush jobs list while retaining the existing authentication and `PLACEMENT_OFFICER` role guards. `OfficerJobsService` requests `GET /officer/jobs` through the configured API base URL and existing authenticated HTTP interceptor. It uses the shared `PageResponse<JobResponse>` types and sends only the supported `page`, `size`, and `sort` parameters. Defaults are page zero, size 20, and `createdAt,desc`; the endpoint does not support job status, keyword, or other filters.

The list displays the backend `totalElements` count and each job's title, company, location, employment type, work mode, status, application deadline, and creation date. Dates use UTC formatting. Loading, empty, API error with retry, refresh, and server pagination states are provided. Changing pages cancels the previous request so stale results cannot replace the current page. No job create, edit, publish, close, or delete actions are included in this stage.
