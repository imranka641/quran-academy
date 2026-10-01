
import {  type FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "../../lib/firebase";
import { useAuth } from "../../contexts/AuthContext";
import type {
  QuranProgress,
  QuranProgressStatus,
  TajweedLevel,
} from "../../types/quranProgress";

interface StudentProfile {
  uid: string;
  fullName: string;
  email: string;
  level?: string;
  program?: string;
  status: string;
}

export default function TeacherQuranProgress() {
  const { studentUid } = useParams<{ studentUid: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [progress, setProgress] = useState<QuranProgress[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [surahNumber, setSurahNumber] = useState("");
  const [surahName, setSurahName] = useState("");
  const [ayahFrom, setAyahFrom] = useState("");
  const [ayahTo, setAyahTo] = useState("");

  const [status, setStatus] =
    useState<QuranProgressStatus>("LEARNING");

  const [tajweedLevel, setTajweedLevel] =
    useState<TajweedLevel>("DEVELOPING");

  const [memorizationScore, setMemorizationScore] =
    useState("");

  const [recitationScore, setRecitationScore] =
    useState("");

  const [teacherNotes, setTeacherNotes] =
    useState("");

  useEffect(() => {
    if (!user || !studentUid) return;

    loadData();
  }, [user, studentUid]);

  async function loadData() {
    if (!user || !studentUid) return;

    setLoading(true);
    setError("");

    try {
      // Verify active teacher assignment.
      const assignmentQuery = query(
        collection(db, "teacherAssignments"),
        where("teacherUid", "==", user.uid),
        where("studentUid", "==", studentUid),
        where("status", "==", "ACTIVE")
      );

      const assignmentSnapshot =
        await getDocs(assignmentQuery);

      if (assignmentSnapshot.empty) {
        setError(
          "You are not currently assigned to this student."
        );

        setStudent(null);
        setProgress([]);
        return;
      }

      // Load student.
      const studentRef = doc(
        db,
        "studentProfiles",
        studentUid
      );

      const studentSnapshot =
        await getDoc(studentRef);

      if (!studentSnapshot.exists()) {
        setError("Student profile was not found.");
        return;
      }

      setStudent({
        uid: studentSnapshot.id,
        ...(studentSnapshot.data() as Omit<
          StudentProfile,
          "uid"
        >),
      });

      // Load Quran progress.
      const progressQuery = query(
        collection(
          db,
          "studentProfiles",
          studentUid,
          "quranProgress"
        ),
        orderBy("createdAt", "desc")
      );

      const progressSnapshot =
        await getDocs(progressQuery);

      const records: QuranProgress[] =
        progressSnapshot.docs.map((progressDoc) => ({
          id: progressDoc.id,
          ...(progressDoc.data() as Omit<
            QuranProgress,
            "id"
          >),
        }));

      setProgress(records);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load Quran progress."
      );
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setSurahNumber("");
    setSurahName("");
    setAyahFrom("");
    setAyahTo("");
    setStatus("LEARNING");
    setTajweedLevel("DEVELOPING");
    setMemorizationScore("");
    setRecitationScore("");
    setTeacherNotes("");
  }

  async function handleCreateProgress(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!user || !studentUid) return;

    if (!surahNumber || !surahName.trim()) {
      setError(
        "Surah number and Surah name are required."
      );
      return;
    }

    if (!ayahFrom || !ayahTo) {
      setError(
        "Ayah range is required."
      );
      return;
    }

    const from = Number(ayahFrom);
    const to = Number(ayahTo);

    if (
      !Number.isInteger(from) ||
      !Number.isInteger(to) ||
      from < 1 ||
      to < from
    ) {
      setError("Enter a valid ayah range.");
      return;
    }

    if (
      memorizationScore &&
      (Number(memorizationScore) < 0 ||
        Number(memorizationScore) > 100)
    ) {
      setError(
        "Memorization score must be between 0 and 100."
      );
      return;
    }

    if (
      recitationScore &&
      (Number(recitationScore) < 0 ||
        Number(recitationScore) > 100)
    ) {
      setError(
        "Recitation score must be between 0 and 100."
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const now = new Date().toISOString();

      const data: Omit<QuranProgress, "id"> = {
        studentUid,
        teacherUid: user.uid,

        surahNumber: Number(surahNumber),
        surahName: surahName.trim(),

        ayahFrom: from,
        ayahTo: to,

        status,

        tajweedLevel,

        memorizationScore:
          memorizationScore
            ? Number(memorizationScore)
            : undefined,

        recitationScore:
          recitationScore
            ? Number(recitationScore)
            : undefined,

        teacherNotes:
          teacherNotes.trim() || "",

        lastReviewedAt: now,

        completedAt:
          status === "MASTERED"
            ? now
            : undefined,

        createdAt: now,
        updatedAt: now,
      };

      await addDoc(
        collection(
          db,
          "studentProfiles",
          studentUid,
          "quranProgress"
        ),
        data
      );

      setSuccess(
        "Quran progress recorded successfully."
      );

      resetForm();

      await loadData();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to save Quran progress."
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateProgress(
    record: QuranProgress,
    newStatus: QuranProgressStatus
  ) {
    if (!studentUid) return;

    try {
      const now = new Date().toISOString();

      const progressRef = doc(
        db,
        "studentProfiles",
        studentUid,
        "quranProgress",
        record.id
      );

      await updateDoc(progressRef, {
        status: newStatus,
        lastReviewedAt: now,
        updatedAt: now,
        ...(newStatus === "MASTERED"
          ? { completedAt: now }
          : {}),
      });

      await loadData();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to update progress."
      );
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">
          Loading Quran progress...
        </p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() =>
              navigate("/teacher/dashboard")
            }
            className="mb-6 text-sm text-slate-600 hover:text-slate-900"
          >
            ← Back to Dashboard
          </button>

          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <h1 className="font-semibold text-red-900">
              Access unavailable
            </h1>

            <p className="text-sm text-red-700 mt-2">
              {error ||
                "Student profile could not be loaded."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <button
            onClick={() =>
              navigate(
                `/teacher/students/${studentUid}`
              )
            }
            className="mb-4 text-sm text-slate-600 hover:text-slate-900"
          >
            ← Back to Student
          </button>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h1 className="text-2xl font-bold text-slate-900">
              Quran Progress
            </h1>

            <p className="text-slate-500 mt-1">
              {student.fullName}
            </p>

            <div className="flex flex-wrap gap-2 mt-3">
              {student.level && (
                <span className="px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-700">
                  {student.level}
                </span>
              )}

              {student.program && (
                <span className="px-3 py-1 rounded-full bg-blue-50 text-xs text-blue-700">
                  {student.program}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Form */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Record Progress
            </h2>

            <p className="text-sm text-slate-500 mt-1 mb-5">
              Record the student's Quran learning progress.
            </p>

            <form
              onSubmit={handleCreateProgress}
              className="space-y-4"
            >

              {/* Surah */}
              <div className="grid grid-cols-3 gap-3">

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    No.
                  </label>

                  <input
                    type="number"
                    min="1"
                    max="114"
                    value={surahNumber}
                    onChange={(e) =>
                      setSurahNumber(e.target.value)
                    }
                    placeholder="1"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Surah
                  </label>

                  <input
                    value={surahName}
                    onChange={(e) =>
                      setSurahName(e.target.value)
                    }
                    placeholder="Al-Fatiha"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </div>

              </div>

              {/* Ayahs */}
              <div className="grid grid-cols-2 gap-3">

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Ayah from
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={ayahFrom}
                    onChange={(e) =>
                      setAyahFrom(e.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Ayah to
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={ayahTo}
                    onChange={(e) =>
                      setAyahTo(e.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </div>

              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status
                </label>

                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(
                      e.target.value as QuranProgressStatus
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                >
                  <option value="NOT_STARTED">
                    Not Started
                  </option>

                  <option value="LEARNING">
                    Learning
                  </option>

                  <option value="MEMORIZED">
                    Memorized
                  </option>

                  <option value="REVISION">
                    Revision
                  </option>

                  <option value="MASTERED">
                    Mastered
                  </option>
                </select>
              </div>

              {/* Tajweed */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tajweed
                </label>

                <select
                  value={tajweedLevel}
                  onChange={(e) =>
                    setTajweedLevel(
                      e.target.value as TajweedLevel
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                >
                  <option value="NEEDS_WORK">
                    Needs Work
                  </option>

                  <option value="DEVELOPING">
                    Developing
                  </option>

                  <option value="GOOD">
                    Good
                  </option>

                  <option value="STRONG">
                    Strong
                  </option>
                </select>
              </div>

              {/* Scores */}
              <div className="grid grid-cols-2 gap-3">

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Memorization %
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={memorizationScore}
                    onChange={(e) =>
                      setMemorizationScore(
                        e.target.value
                      )
                    }
                    placeholder="0-100"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Recitation %
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={recitationScore}
                    onChange={(e) =>
                      setRecitationScore(
                        e.target.value
                      )
                    }
                    placeholder="0-100"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </div>

              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Teacher notes
                </label>

                <textarea
                  value={teacherNotes}
                  onChange={(e) =>
                    setTeacherNotes(e.target.value)
                  }
                  rows={4}
                  placeholder="Example: Good fluency, needs improvement with madd rules."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-slate-900 text-white px-4 py-2.5 text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save Progress"}
              </button>

            </form>
          </div>

          {/* Progress history */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">

            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Quran Learning History
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  {progress.length} record
                  {progress.length === 1
                    ? ""
                    : "s"}
                </p>
              </div>
            </div>

            {progress.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
                <p className="text-slate-500">
                  No Quran progress recorded yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">

                {progress.map((record) => (
                  <div
                    key={record.id}
                    className="rounded-xl border border-slate-200 p-5"
                  >

                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">

                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {record.surahNumber}.{" "}
                          {record.surahName}
                        </h3>

                        <p className="text-sm text-slate-500 mt-1">
                          Ayah {record.ayahFrom}–
                          {record.ayahTo}
                        </p>
                      </div>

                      <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                        {record.status.replace(
                          "_",
                          " "
                        )}
                      </span>

                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">

                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">
                          Tajweed
                        </p>

                        <p className="text-sm font-medium text-slate-900 mt-1">
                          {record.tajweedLevel
                            ?.replace("_", " ") ||
                            "—"}
                        </p>
                      </div>

                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">
                          Memorization
                        </p>

                        <p className="text-sm font-medium text-slate-900 mt-1">
                          {record.memorizationScore !==
                          undefined
                            ? `${record.memorizationScore}%`
                            : "—"}
                        </p>
                      </div>

                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">
                          Recitation
                        </p>

                        <p className="text-sm font-medium text-slate-900 mt-1">
                          {record.recitationScore !==
                          undefined
                            ? `${record.recitationScore}%`
                            : "—"}
                        </p>
                      </div>

                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">
                          Reviewed
                        </p>

                        <p className="text-sm font-medium text-slate-900 mt-1">
                          {record.lastReviewedAt
                            ? new Date(
                                record.lastReviewedAt
                              ).toLocaleDateString()
                            : "—"}
                        </p>
                      </div>

                    </div>

                    {record.teacherNotes && (
                      <div className="mt-4 rounded-lg bg-slate-50 p-4">
                        <p className="text-xs font-medium text-slate-500 uppercase">
                          Teacher notes
                        </p>

                        <p className="text-sm text-slate-700 mt-1">
                          {record.teacherNotes}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mt-4">

                      {record.status ===
                        "LEARNING" && (
                        <button
                          onClick={() =>
                            updateProgress(
                              record,
                              "MEMORIZED"
                            )
                          }
                          className="px-3 py-2 rounded-lg bg-green-50 text-green-700 text-sm hover:bg-green-100"
                        >
                          Mark Memorized
                        </button>
                      )}

                      {record.status ===
                        "MEMORIZED" && (
                        <button
                          onClick={() =>
                            updateProgress(
                              record,
                              "REVISION"
                            )
                          }
                          className="px-3 py-2 rounded-lg bg-yellow-50 text-yellow-700 text-sm hover:bg-yellow-100"
                        >
                          Move to Revision
                        </button>
                      )}

                      {record.status ===
                        "REVISION" && (
                        <button
                          onClick={() =>
                            updateProgress(
                              record,
                              "MASTERED"
                            )
                          }
                          className="px-3 py-2 rounded-lg bg-green-50 text-green-700 text-sm hover:bg-green-100"
                        >
                          Mark Mastered
                        </button>
                      )}

                    </div>

                  </div>
                ))}

              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}

