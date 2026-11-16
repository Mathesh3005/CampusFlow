export interface StudentProject {
  id: number;
  studentId: number;
  title: string;
  description: string | null;
  githubUrl: string | null;
  liveDemoUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentProjectRequest {
  title: string;
  description: string | null;
  githubUrl: string | null;
  liveDemoUrl: string | null;
  startDate: string | null;
  endDate: string | null;
}
