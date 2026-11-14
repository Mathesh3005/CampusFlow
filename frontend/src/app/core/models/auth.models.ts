export enum UserRole {
  Student = 'STUDENT',
  PlacementOfficer = 'PLACEMENT_OFFICER',
  Admin = 'ADMIN',
}

export interface AuthResponse {
  accessToken: string;
  tokenType: 'Bearer' | string;
  expiresAt: string;
  userId: number;
  email: string;
  role: UserRole;
}

export type AuthenticatedUser = Pick<AuthResponse, 'userId' | 'email' | 'role' | 'expiresAt'>;

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterStudentRequest {
  email: string;
  password: string;
  registerNumber: string;
  fullName: string;
  department: string;
  graduationYear: number;
}
