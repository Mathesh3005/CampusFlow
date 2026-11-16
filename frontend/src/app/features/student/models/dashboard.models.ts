import { ApplicationResponse, InterviewResponse, JobResponse, NotificationResponse, PageResponse } from '../../../core/models/domain.models';

export interface DashboardSection<T> {
  page: PageResponse<T> | null;
  error: string | null;
}

export interface InterviewDashboardSection {
  interviews: InterviewResponse[];
  error: string | null;
  partialResults: boolean;
}

export interface StudentDashboardSummary {
  studentName: string;
  department: string;
  graduationYear: number | null;
  cgpa: number | null;
  totalApplications: number;
  applicationStats: Record<string, number>;
  upcomingInterviews: number;
  hasActiveResume: boolean;
  unreadNotifications: number;
}

export interface StudentDashboardData {
  summary: StudentDashboardSummary | null;
  summaryError: string | null;
  applications: DashboardSection<ApplicationResponse>;
  jobs: DashboardSection<JobResponse>;
  interviews: InterviewDashboardSection;
  notifications: DashboardSection<NotificationResponse>;
}

export type DashboardLoadState =
  | { status: 'loading'; data: null; error: null }
  | { status: 'ready'; data: StudentDashboardData; error: null }
  | { status: 'error'; data: null; error: string };
