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

export interface StudentDashboardData {
  applications: DashboardSection<ApplicationResponse>;
  jobs: DashboardSection<JobResponse>;
  interviews: InterviewDashboardSection;
  notifications: DashboardSection<NotificationResponse>;
}

export type DashboardLoadState =
  | { status: 'loading'; data: null; error: null }
  | { status: 'ready'; data: StudentDashboardData; error: null }
  | { status: 'error'; data: null; error: string };
