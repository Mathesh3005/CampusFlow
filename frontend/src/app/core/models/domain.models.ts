export enum EmploymentType { FullTime = 'FULL_TIME', Internship = 'INTERNSHIP' }
export enum WorkMode { Onsite = 'ONSITE', Remote = 'REMOTE', Hybrid = 'HYBRID' }
export enum JobStatus { Draft = 'DRAFT', Published = 'PUBLISHED', Closed = 'CLOSED' }
export enum ApplicationStatus {
  Applied = 'APPLIED', UnderReview = 'UNDER_REVIEW', Shortlisted = 'SHORTLISTED',
  Rejected = 'REJECTED', Selected = 'SELECTED', Withdrawn = 'WITHDRAWN',
}
export enum InterviewMode { Online = 'ONLINE', Offline = 'OFFLINE' }
export enum InterviewStatus { Scheduled = 'SCHEDULED', Completed = 'COMPLETED', Cancelled = 'CANCELLED' }
export enum NotificationType { JobUpdate = 'JOB_UPDATE', ApplicationUpdate = 'APPLICATION_UPDATE', Interview = 'INTERVIEW', System = 'SYSTEM' }

export interface JobResponse {
  id: number; createdById: number; companyName: string; jobTitle: string; jobDescription: string;
  location: string | null; employmentType: EmploymentType; workMode: WorkMode;
  minimumCgpa: number | null; salaryMin: number | null; salaryMax: number | null;
  applicationDeadline: string; status: JobStatus; createdAt: string; updatedAt: string;
}
export interface JobRequest {
  companyName: string; jobTitle: string; jobDescription: string; location?: string | null;
  employmentType: EmploymentType; workMode: WorkMode; minimumCgpa?: number | null;
  salaryMin?: number | null; salaryMax?: number | null; applicationDeadline: string;
}
export interface ApplicationResponse {
  id: number; studentId: number; jobId: number; resumeId: number | null; companyName: string;
  jobTitle: string; coverLetter: string | null; status: ApplicationStatus; appliedAt: string; updatedAt: string;
}
export interface ApplicationRequest { jobId: number; resumeId?: number | null; coverLetter?: string | null; }
export interface ResumeResponse {
  id: number; studentId: number; fileName: string; fileSize: number; contentType: string;
  active: boolean; uploadedAt: string;
}
export interface InterviewResponse {
  id: number; applicationId: number; scheduledAt: string; interviewMode: InterviewMode;
  locationOrLink: string; status: InterviewStatus; notes: string | null; createdAt: string; updatedAt: string;
}
export interface NotificationResponse {
  id: number; userId: number; title: string; message: string; notificationType: NotificationType;
  isRead: boolean; createdAt: string;
}
export interface PageResponse<T> {
  content: T[]; page: number; size: number; totalElements: number; totalPages: number;
  first: boolean; last: boolean; hasNext: boolean; hasPrevious: boolean;
}
