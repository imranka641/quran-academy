
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
  StudentLesson,
  LessonStatus,
  LessonType,
} from "../../types/lesson";

interface StudentProfile {
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
  status: string;
}

interface Assignment {
  id: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  teacherUid: string;
  teacherName: string;
  teacherEmail: string;
  program?: string;
  notes?: string;
  status: string;
  assignedAt: string;
}

export default function TeacherStudentDetails() {
  const { studentUid } = useParams<{
    studentUid: string;
  }>();

  const { user } = useAuth();
  const navigate = useNavigate();

  const [student, setStudent] =
    useState<StudentProfile | null>(null);

  const [assignment, setAssignment] =
    useState<Assignment | null>(null);

  const [lessons, setLessons] =
    useState<StudentLesson[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  // ============================================================
  // LESSON FORM
  // ============================================================

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [type, setType] =
    useState<LessonType>("QURAN_READING");

  const [surah, setSurah] =
    useState("");

  const [ayahFrom, setAyahFrom] =
    useState("");

  const [ayahTo, setAyahTo] =
    useState("");

  const [dueDate, setDueDate] =
    useState("");

  const [teacherNotes, setTeacherNotes] =
    useState("");


  // ============================================================
  // LOAD
  // ============================================================

  useEffect(() => {
    if (!user || !studentUid) {
      return;
    }

    void loadStudent();
  }, [user, studentUid]);


  async function loadStudent() {
    if (!user || !studentUid) {
      return;
    }

    setLoading(true);
    setError("");

    try {

      // ========================================================
      // 1. VERIFY ACTIVE ASSIGNMENT
      // ========================================================

      const assignmentQuery = query(
        collection(db, "teacherAssignments"),

        where(
          "teacherUid",
          "==",
          user.uid
        ),

        where(
          "studentUid",
          "==",
          studentUid
        ),

        where(
          "status",
          "==",
          "ACTIVE"
        )
      );

      const assignmentSnapshot =
        await getDocs(assignmentQuery);

      if (assignmentSnapshot.empty) {
        setError(
          "You are not currently assigned to this student."
        );

        setStudent(null);
        setAssignment(null);
        setLessons([]);

        return;
      }

      const assignmentDocument =
        assignmentSnapshot.docs[0];

      setAssignment({
        id: assignmentDocument.id,
        ...(assignmentDocument.data() as Omit<
          Assignment,
          "id"
        >),
      });


      // ========================================================
      // 2. LOAD STUDENT PROFILE
      // ========================================================

      const studentRef = doc(
        db,
        "studentProfiles",
        studentUid
      );

      const studentSnapshot =
        await getDoc(studentRef);

      if (!studentSnapshot.exists()) {
        setError(
          "Student profile was not found."
        );

        return;
      }

      setStudent({
        uid: studentSnapshot.id,
        ...(studentSnapshot.data() as Omit<
          StudentProfile,
          "uid"
        >),
      });


      // ========================================================
      // 3. LOAD STUDENT LESSONS
      //
      // IMPORTANT:
      // The teacher query explicitly filters by teacherUid.
      // This matches the Firestore security rule.
      // ========================================================

      const lessonsQuery = query(
        collection(
          db,
          "studentProfiles",
          studentUid,
          "lessons"
        ),

        where(
          "teacherUid",
          "==",
          user.uid
        ),

        orderBy(
          "createdAt",
          "desc"
        )
      );

      const lessonsSnapshot =
        await getDocs(lessonsQuery);

      const loadedLessons: StudentLesson[] =
        lessonsSnapshot.docs.map(
          (lessonDoc) => ({
            id: lessonDoc.id,
            ...(lessonDoc.data() as Omit<
              StudentLesson,
              "id"
            >),
          })
        );

      setLessons(loadedLessons);

    } catch (err) {

      console.error(
        "Failed to load student:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load student."
      );

    } finally {
      setLoading(false);
    }
  }


  // ============================================================
  // CREATE LESSON
  // ============================================================

  async function handleCreateLesson(
    e: FormEvent
  ) {
    e.preventDefault();

    if (!user || !studentUid) {
      return;
    }

    setError("");
    setSuccess("");

    if (!title.trim()) {
      setError(
        "Lesson title is required."
      );

      return;
    }

    setSaving(true);

    try {

      const now =
        new Date().toISOString();

      const lessonData: Omit<
        StudentLesson,
        "id"
      > = {

        studentUid,

        teacherUid:
          user.uid,

        title:
          title.trim(),

        description:
          description.trim(),

        type,

        surah:
          surah.trim() || undefined,

        ayahFrom:
          ayahFrom
            ? Number(ayahFrom)
            : undefined,

        ayahTo:
          ayahTo
            ? Number(ayahTo)
            : undefined,

        dueDate:
          dueDate || undefined,

        status:
          "ASSIGNED",

        teacherNotes:
          teacherNotes.trim(),

        createdAt:
          now,

        updatedAt:
          now,
      };


      await addDoc(
        collection(
          db,
          "studentProfiles",
          studentUid,
          "lessons"
        ),
        lessonData
      );


      setSuccess(
        "Lesson assigned successfully."
      );


      // Reset form.
      setTitle("");
      setDescription("");
      setType("QURAN_READING");
      setSurah("");
      setAyahFrom("");
      setAyahTo("");
      setDueDate("");
      setTeacherNotes("");


      // Reload.
      await loadStudent();

    } catch (err) {

      console.error(
        "Failed to create lesson:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to create lesson."
      );

    } finally {
      setSaving(false);
    }
  }


  // ============================================================
  // UPDATE LESSON STATUS
  // ============================================================

  async function updateLessonStatus(
    lesson: StudentLesson,
    status: LessonStatus
  ) {
    if (!studentUid) {
      return;
    }

    setError("");
    setSuccess("");

    try {

      const now =
        new Date().toISOString();

      const lessonRef = doc(
        db,
        "studentProfiles",
        studentUid,
        "lessons",
        lesson.id
      );

      const updateData: {
        status: LessonStatus;
        updatedAt: string;
        completedAt?: string;
      } = {
        status,
        updatedAt: now,
      };

      if (status === "COMPLETED") {
        updateData.completedAt = now;
      }

      await updateDoc(
        lessonRef,
        updateData
      );

      setSuccess(
        "Lesson status updated."
      );

      await loadStudent();

    } catch (err) {

      console.error(
        "Failed to update lesson:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to update lesson."
      );
    }
  }


  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">
          Loading student...
        </div>
      </div>
    );
  }


  // ============================================================
  // NO STUDENT
  // ============================================================

  if (!student) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">

        <div className="max-w-4xl mx-auto">

          <button
            onClick={() =>
              navigate(
                "/teacher/dashboard"
              )
            }
            className="mb-6 text-sm text-slate-600 hover:text-slate-900"
          >
            ← Back to My Students
          </button>

          <div className="rounded-xl border border-red-200 bg-red-50 p-6">

            <h1 className="text-lg font-semibold text-red-900">
              Access unavailable
            </h1>

            <p className="mt-2 text-sm text-red-700">
              {error ||
                "Student profile could not be loaded."}
            </p>

          </div>

        </div>

      </div>
    );
  }


  // ============================================================
  // MAIN UI
  // ============================================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">

      <div className="max-w-7xl mx-auto space-y-6">


        {/* ======================================================
            HEADER
        ====================================================== */}

        <div>

          <button
            onClick={() =>
              navigate(
                "/teacher/dashboard"
              )
            }
            className="mb-4 text-sm text-slate-600 hover:text-slate-900"
          >
            ← Back to My Students
          </button>


          <div className="bg-white rounded-2xl border border-slate-200 p-6">

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

              <div>

                <h1 className="text-2xl font-bold text-slate-900">
                  {student.fullName}
                </h1>

                <p className="text-slate-500 mt-1">
                  {student.email}
                </p>


                <div className="flex flex-wrap gap-2 mt-3">

                  {student.level && (
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs">
                      Level: {student.level}
                    </span>
                  )}


                  {student.program && (
                    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs">
                      {student.program}
                    </span>
                  )}


                  <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs">
                    {student.status}
                  </span>

                </div>

              </div>


              <div className="bg-slate-50 rounded-xl p-4 min-w-[220px]">

                <p className="text-xs text-slate-500">
                  Current teacher assignment
                </p>

                <p className="font-semibold text-slate-900 mt-1">
                  {assignment?.teacherName}
                </p>

                {assignment?.assignedAt && (
                  <p className="text-xs text-slate-500 mt-1">
                    Assigned{" "}
                    {new Date(
                      assignment.assignedAt
                    ).toLocaleDateString()}
                  </p>
                )}

              </div>

            </div>

          </div>

        </div>


        {/* ======================================================
            ALERTS
        ====================================================== */}

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


        {/* ======================================================
            STUDENT INFORMATION
        ====================================================== */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <div className="bg-white rounded-xl border border-slate-200 p-5">

            <p className="text-xs text-slate-500">
              Phone
            </p>

            <p className="mt-1 font-medium text-slate-900">
              {student.phone ||
                "Not provided"}
            </p>

          </div>


          <div className="bg-white rounded-xl border border-slate-200 p-5">

            <p className="text-xs text-slate-500">
              Parent / Guardian
            </p>

            <p className="mt-1 font-medium text-slate-900">
              {student.parentName ||
                "Not provided"}
            </p>

            {student.parentPhone && (
              <p className="text-sm text-slate-500 mt-1">
                {student.parentPhone}
              </p>
            )}

          </div>


          <div className="bg-white rounded-xl border border-slate-200 p-5">

            <p className="text-xs text-slate-500">
              Gender
            </p>

            <p className="mt-1 font-medium text-slate-900">
              {student.gender ||
                "Not provided"}
            </p>

          </div>

        </div>


        {/* ======================================================
            LEARNING WORKSPACE
        ====================================================== */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">


          {/* ====================================================
              CREATE LESSON
          ==================================================== */}

          <div className="lg:col-span-1">

            <div className="bg-white rounded-2xl border border-slate-200 p-6">

              <h2 className="text-lg font-semibold text-slate-900">
                Assign Lesson
              </h2>

              <p className="text-sm text-slate-500 mt-1 mb-5">
                Create a Quran learning task
                for this student.
              </p>


              <form
                onSubmit={handleCreateLesson}
                className="space-y-4"
              >


                {/* TITLE */}

                <div>

                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Lesson title
                  </label>

                  <input
                    value={title}
                    onChange={(e) =>
                      setTitle(
                        e.target.value
                      )
                    }
                    placeholder="Example: Surah Al-Fatiha memorization"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                </div>


                {/* TYPE */}

                <div>

                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Lesson type
                  </label>

                  <select
                    value={type}
                    onChange={(e) =>
                      setType(
                        e.target.value as LessonType
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  >

                    <option value="QURAN_READING">
                      Quran Reading
                    </option>

                    <option value="TAJWEED">
                      Tajweed
                    </option>

                    <option value="HIFZ">
                      Hifz / Memorization
                    </option>

                    <option value="REVIEW">
                      Review
                    </option>

                    <option value="GENERAL">
                      General
                    </option>

                  </select>

                </div>


                {/* DESCRIPTION */}

                <div>

                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>

                  <textarea
                    value={description}
                    onChange={(e) =>
                      setDescription(
                        e.target.value
                      )
                    }
                    rows={3}
                    placeholder="What should the student study?"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  />

                </div>


                {/* QURAN DETAILS */}

                {(type === "QURAN_READING" ||
                  type === "HIFZ" ||
                  type === "REVIEW") && (
                  <>

                    <div>

                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Surah
                      </label>

                      <input
                        value={surah}
                        onChange={(e) =>
                          setSurah(
                            e.target.value
                          )
                        }
                        placeholder="Example: Al-Baqarah"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                      />

                    </div>


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
                            setAyahFrom(
                              e.target.value
                            )
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
                            setAyahTo(
                              e.target.value
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                        />

                      </div>

                    </div>

                  </>
                )}


                {/* DUE DATE */}

                <div>

                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Due date
                  </label>

                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) =>
                      setDueDate(
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  />

                </div>


                {/* NOTES */}

                <div>

                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Teacher notes
                  </label>

                  <textarea
                    value={teacherNotes}
                    onChange={(e) =>
                      setTeacherNotes(
                        e.target.value
                      )
                    }
                    rows={3}
                    placeholder="Private notes for this lesson..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  />

                </div>


                {/* SUBMIT */}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-lg bg-slate-900 text-white px-4 py-2.5 text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving
                    ? "Assigning..."
                    : "Assign Lesson"}
                </button>

              </form>

            </div>

          </div>


          {/* ====================================================
              LESSON LIST
          ==================================================== */}

          <div className="lg:col-span-2">

            <div className="bg-white rounded-2xl border border-slate-200 p-6">

              <div className="flex items-center justify-between mb-5">

                <div>

                  <h2 className="text-lg font-semibold text-slate-900">
                    Learning Plan
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    {lessons.length} lesson
                    {lessons.length === 1
                      ? ""
                      : "s"}
                  </p>

                </div>

              </div>


              {lessons.length === 0 ? (

                <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">

                  <p className="text-slate-500">
                    No lessons assigned yet.
                  </p>

                  <p className="text-sm text-slate-400 mt-1">
                    Create the student's
                    first lesson using the
                    form.
                  </p>

                </div>

              ) : (

                <div className="space-y-4">

                  {lessons.map(
                    (lesson) => (

                      <div
                        key={lesson.id}
                        className="rounded-xl border border-slate-200 p-5"
                      >

                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">

                          <div>

                            <h3 className="font-semibold text-slate-900">
                              {lesson.title}
                            </h3>


                            <div className="flex flex-wrap gap-2 mt-2">

                              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs">
                                {lesson.type.replace(
                                  "_",
                                  " "
                                )}
                              </span>


                              <span
                                className={`px-2.5 py-1 rounded-full text-xs ${
                                  lesson.status ===
                                  "COMPLETED"
                                    ? "bg-green-50 text-green-700"
                                    : lesson.status ===
                                      "IN_PROGRESS"
                                    ? "bg-yellow-50 text-yellow-700"
                                    : lesson.status ===
                                      "CANCELLED"
                                    ? "bg-red-50 text-red-700"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {lesson.status.replace(
                                  "_",
                                  " "
                                )}
                              </span>

                            </div>

                          </div>


                          {lesson.dueDate && (
                            <div className="text-sm text-slate-500">
                              Due:{" "}
                              {new Date(
                                `${lesson.dueDate}T00:00:00`
                              ).toLocaleDateString()}
                            </div>
                          )}

                        </div>


                        {lesson.description && (
                          <p className="text-sm text-slate-600 mt-4">
                            {lesson.description}
                          </p>
                        )}


                        {(lesson.surah ||
                          lesson.ayahFrom ||
                          lesson.ayahTo) && (

                          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">

                            <span className="font-medium text-slate-700">
                              Quran:
                            </span>{" "}

                            {lesson.surah ||
                              "—"}

                            {lesson.ayahFrom && (
                              <>
                                {" "}
                                • Ayah{" "}
                                {lesson.ayahFrom}
                              </>
                            )}

                            {lesson.ayahTo && (
                              <>
                                {" "}
                                to{" "}
                                {lesson.ayahTo}
                              </>
                            )}

                          </div>
                        )}


                        {lesson.teacherNotes && (

                          <div className="mt-4">

                            <p className="text-xs font-medium text-slate-500 uppercase">
                              Teacher notes
                            </p>

                            <p className="text-sm text-slate-600 mt-1">
                              {lesson.teacherNotes}
                            </p>

                          </div>

                        )}


                        {/* STATUS ACTIONS */}

                        <div className="flex flex-wrap gap-2 mt-5">

                          {lesson.status ===
                            "ASSIGNED" && (

                            <button
                              onClick={() =>
                                updateLessonStatus(
                                  lesson,
                                  "IN_PROGRESS"
                                )
                              }
                              className="px-3 py-2 rounded-lg bg-yellow-50 text-yellow-700 text-sm hover:bg-yellow-100"
                            >
                              Start
                            </button>

                          )}


                          {lesson.status ===
                            "IN_PROGRESS" && (

                            <button
                              onClick={() =>
                                updateLessonStatus(
                                  lesson,
                                  "COMPLETED"
                                )
                              }
                              className="px-3 py-2 rounded-lg bg-green-50 text-green-700 text-sm hover:bg-green-100"
                            >
                              Mark Completed
                            </button>

                          )}


                          {lesson.status !==
                            "COMPLETED" &&
                            lesson.status !==
                              "CANCELLED" && (

                            <button
                              onClick={() =>
                                updateLessonStatus(
                                  lesson,
                                  "CANCELLED"
                                )
                              }
                              className="px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm hover:bg-red-100"
                            >
                              Cancel
                            </button>

                          )}

                        </div>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

