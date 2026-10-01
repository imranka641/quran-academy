
export type AssignmentStatus =
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "TRANSFERRED"
  | "CANCELLED";

export interface TeacherAssignment {
  id: string;

  studentUid: string;
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  studentGender?: "MALE" | "FEMALE";
  studentDateOfBirth?: string;
  studentParentName?: string;
  studentParentPhone?: string;
  studentLevel?: string;

  teacherUid: string;
  teacherName: string;
  teacherEmail: string;

  program?: string;
  notes?: string;

  status: AssignmentStatus;

  assignedAt: string;
  startedAt?: string;
  endedAt?: string;

  createdAt: string;
  updatedAt: string;
}

