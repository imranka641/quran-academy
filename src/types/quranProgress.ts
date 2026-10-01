
export type QuranProgressStatus =
  | "NOT_STARTED"
  | "LEARNING"
  | "MEMORIZED"
  | "REVISION"
  | "MASTERED";

export type TajweedLevel =
  | "NEEDS_WORK"
  | "DEVELOPING"
  | "GOOD"
  | "STRONG";

export interface QuranProgress {
  id: string;

  studentUid: string;
  teacherUid: string;

  surahNumber: number;
  surahName: string;

  ayahFrom: number;
  ayahTo: number;

  status: QuranProgressStatus;

  tajweedLevel?: TajweedLevel;

  memorizationScore?: number;
  recitationScore?: number;

  teacherNotes?: string;

  lastReviewedAt?: string;
  completedAt?: string;

  createdAt: string;
  updatedAt: string;
}

