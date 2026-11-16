export interface AdminDashboard {
  totalUsers: number;
  totalStudents: number;
  totalOfficers: number;
  activeOfficers: number;
  totalJobs: number;
  publishedJobs: number;
  totalApplications: number;
}

export interface PlacementOfficerAdmin {
  id: number;
  userId: number;
  email: string;
  fullName: string;
  employeeId: string;
  department: string;
  phone: string | null;
  active: boolean;
  createdAt: string;
}

export interface PlacementOfficerQuery {
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface CreatePlacementOfficerRequest {
  email: string;
  password: string;
  employeeId: string;
  fullName: string;
  department: string;
}
