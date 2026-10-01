
export type LessonType =
  | "QURAN_READING"
  | "TAJWEED"
  | "HIFZ"
  | "REVIEW"
  | "GENERAL";

export type LessonStatus =
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export interface StudentLesson {
  id: string;

  studentUid: string;
  teacherUid: string;

  title: string;
  description?: string;

  type: LessonType;

  surah?: string;
  ayahFrom?: number;
  ayahTo?: number;

  dueDate?: string;

  status: LessonStatus;

  teacherNotes?: string;

  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

