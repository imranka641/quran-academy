export type TeacherStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED";

export interface TeacherProfile {
  uid: string;
  fullName: string;
  email: string;
  phone?: string;
  gender?: "MALE" | "FEMALE";
  specialization?: string[];
  experienceYears?: number;
  bio?: string;
  status: TeacherStatus;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
}