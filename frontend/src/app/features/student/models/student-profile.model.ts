export interface StudentProfile {
  id: number;
  registerNumber: string;
  fullName: string;
  department: string;
  graduationYear: number;
  cgpa: number | null;
  phone: string | null;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentProfileUpdate {
  fullName: string;
  department: string;
  graduationYear: number;
  cgpa: number | null;
  phone: string | null;
}
