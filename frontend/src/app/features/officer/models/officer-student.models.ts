import { ApplicationStatus } from '../../../core/models/domain.models';

export interface OfficerStudent {
  id: number;
  registerNumber: string;
  fullName: string;
  department: string;
  graduationYear: number | null;
  cgpa: number | null;
  phone: string | null;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfficerStudentQuery {
  search?: string;
  department?: string;
  graduationYear?: number | null;
  page?: number;
  size?: number;
  sort?: string;
}

export interface OfficerStudentSkill {
  skillId: number;
  skillName: string;
  proficiencyLevel: string;
  createdAt: string;
}

export interface OfficerStudentProject {
  id: number;
  title: string;
  description: string | null;
  githubUrl: string | null;
  liveDemoUrl: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface OfficerStudentApplication {
  id: number;
  jobId: number;
  jobTitle: string;
  companyName: string;
  status: ApplicationStatus;
  appliedAt: string;
}

export interface OfficerStudentDetail {
  student: OfficerStudent;
  skills: OfficerStudentSkill[];
  projects: OfficerStudentProject[];
  applications: OfficerStudentApplication[];
}
