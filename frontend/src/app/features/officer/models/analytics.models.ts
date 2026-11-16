export interface AnalyticsOverview {
  placementRate: number;
  publishedJobs: number;
  selectedStudents: number;
  totalApplicants: number;
  selectedApplications: number;
  applicationSelectionRate: number;
  totalApplications: number;
  totalJobs: number;
  totalStudents: number;
}

export interface DepartmentPlacement {
  department: string;
  totalApplications: number;
  shortlistedApplications: number;
  selectedApplications: number;
  placementRate: number;
}

export interface PlacementTrend {
  graduationYear: number;
  totalApplications: number;
  selectedApplications: number;
  placementRate: number;
}
