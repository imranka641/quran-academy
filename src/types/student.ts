export type StudentStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED"
  | "GRADUATED";

export interface StudentProfile {
  uid: string;
  fullName: string;
  email: string;
  phone?: string;
  gender?: "MALE" | "FEMALE";
  dateOfBirth?: string;
  parentName?: string;
  parentPhone?: string;
  level?: string;
  program?: string;
  status: StudentStatus;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
}