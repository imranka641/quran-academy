
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
  writeBatch,
  doc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../contexts/AuthContext";

interface Student {
  uid: string;
  fullName: string;
  email: string;
  program?: string;
  level?: string;
  status: string;
}

interface Teacher {
  uid: string;
  fullName: string;
  email: string;
  status: string;
}

interface TeacherAssignment {
  id: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  teacherUid: string;
  teacherName: string;
  teacherEmail: string;
  program?: string;
  notes?: string;
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "TRANSFERRED" | "CANCELLED";
  assignedAt: string;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
}

function createId(): string {
  return doc(collection(db, "_ids")).id;
}

export default function TeacherAssignments() {
  const { user } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);

  const [studentUid, setStudentUid] = useState("");
  const [teacherUid, setTeacherUid] = useState("");
  const [program, setProgram] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const studentsQuery = query(
        collection(db, "studentProfiles"),
        where("status", "==", "ACTIVE")
      );

      const teachersQuery = query(
        collection(db, "teacherProfiles"),
        where("status", "==", "ACTIVE")
      );

      const assignmentsQuery = query(
        collection(db, "teacherAssignments"),
        orderBy("createdAt", "desc")
      );

      const [
        studentsSnapshot,
        teachersSnapshot,
        assignmentsSnapshot,
      ] = await Promise.all([
        getDocs(studentsQuery),
        getDocs(teachersQuery),
        getDocs(assignmentsQuery),
      ]);

      const studentData: Student[] = studentsSnapshot.docs.map((item) => {
        const data = item.data();

        return {
          uid: item.id,
          fullName: data.fullName || "",
          email: data.email || "",
          program: data.program || "",
          level: data.level || "",
          status: data.status || "ACTIVE",
        };
      });

      const teacherData: Teacher[] = teachersSnapshot.docs.map((item) => {
        const data = item.data();

        return {
          uid: item.id,
          fullName: data.fullName || "",
          email: data.email || "",
          status: data.status || "ACTIVE",
        };
      });

      const assignmentData: TeacherAssignment[] =
        assignmentsSnapshot.docs.map((item) => {
          const data = item.data();

          return {
            id: item.id,
            studentUid: data.studentUid,
            studentName: data.studentName,
            studentEmail: data.studentEmail,
            teacherUid: data.teacherUid,
            teacherName: data.teacherName,
            teacherEmail: data.teacherEmail,
            program: data.program || "",
            notes: data.notes || "",
            status: data.status,
            assignedAt: data.assignedAt,
            startedAt: data.startedAt,
            endedAt: data.endedAt,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        });

      setStudents(studentData);
      setTeachers(teacherData);
      setAssignments(assignmentData);
    } catch (err) {
      console.error("Failed to load teacher assignments:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load teacher assignments."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function getActiveAssignmentForStudent(
    uid: string
  ): TeacherAssignment | undefined {
    return assignments.find(
      (assignment) =>
        assignment.studentUid === uid &&
        assignment.status === "ACTIVE"
    );
  }

  async function handleAssign() {
    setError("");
    setSuccess("");

    if (!user) {
      setError("You must be logged in as an administrator.");
      return;
    }

    if (!studentUid) {
      setError("Please select a student.");
      return;
    }

    if (!teacherUid) {
      setError("Please select a teacher.");
      return;
    }

    const student = students.find(
      (item) => item.uid === studentUid
    );

    const teacher = teachers.find(
      (item) => item.uid === teacherUid
    );

    if (!student) {
      setError("Selected student could not be found.");
      return;
    }

    if (!teacher) {
      setError("Selected teacher could not be found.");
      return;
    }

    const existingAssignment =
      getActiveAssignmentForStudent(studentUid);

    if (existingAssignment) {
      setError(
        `${student.fullName} is already assigned to ${existingAssignment.teacherName}.`
      );
      return;
    }

    try {
      setSaving(true);

      const now = new Date().toISOString();

      /*
       * Generate the assignment ID ourselves so the same ID
       * can be stored inside the teacherAccess document.
       */
      const assignmentRef = doc(
        collection(db, "teacherAssignments")
      );

      const assignmentId = assignmentRef.id;

      /*
       * Required access document:
       *
       * studentProfiles/{studentUid}/teacherAccess/{teacherUid}
       *
       * This is what Firestore Security Rules use to verify
       * that this teacher is allowed to access this student.
       */
      const teacherAccessRef = doc(
        db,
        "studentProfiles",
        studentUid,
        "teacherAccess",
        teacherUid
      );

      const batch = writeBatch(db);

      /*
       * 1. Create the teacher assignment.
       */
      batch.set(assignmentRef, {
        studentUid: student.uid,
        studentName: student.fullName,
        studentEmail: student.email,

        teacherUid: teacher.uid,
        teacherName: teacher.fullName,
        teacherEmail: teacher.email,

        program: program.trim() || student.program || "",

        notes: notes.trim(),

        status: "ACTIVE",

        assignedAt: now,
        startedAt: now,

        createdAt: now,
        updatedAt: now,
      });

      /*
       * 2. Create the teacher access document.
       *
       * This MUST be created together with the assignment.
       */
      batch.set(teacherAccessRef, {
        teacherUid: teacher.uid,
        studentUid: student.uid,

        assignmentId,

        status: "ACTIVE",

        createdAt: now,
        updatedAt: now,
      });

      /*
       * Both writes succeed together or fail together.
       */
      await batch.commit();

      setSuccess(
        `${student.fullName} has been assigned to ${teacher.fullName}.`
      );

      setStudentUid("");
      setTeacherUid("");
      setProgram("");
      setNotes("");

      await loadData();
    } catch (err) {
      console.error("Failed to assign teacher:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to create teacher assignment."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-600">
            Loading teacher assignments...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Teacher Assignments
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Assign active students to teachers and manage their
            learning relationship.
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Assignment form */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Assign Teacher
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            The student will automatically receive access to the
            selected teacher, and the teacher will receive access
            to the student's learning data.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {/* Student */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Student
              </label>

              <select
                value={studentUid}
                onChange={(event) => {
                  const selectedUid = event.target.value;

                  setStudentUid(selectedUid);

                  const selectedStudent = students.find(
                    (student) => student.uid === selectedUid
                  );

                  if (selectedStudent?.program) {
                    setProgram(selectedStudent.program);
                  } else {
                    setProgram("");
                  }

                  setError("");
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                <option value="">
                  Select student
                </option>

                {students.map((student) => {
                  const existing =
                    getActiveAssignmentForStudent(
                      student.uid
                    );

                  return (
                    <option
                      key={student.uid}
                      value={student.uid}
                      disabled={Boolean(existing)}
                    >
                      {student.fullName} —{" "}
                      {student.email}
                      {existing
                        ? ` (Assigned to ${existing.teacherName})`
                        : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Teacher */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Teacher
              </label>

              <select
                value={teacherUid}
                onChange={(event) => {
                  setTeacherUid(event.target.value);
                  setError("");
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                <option value="">
                  Select teacher
                </option>

                {teachers.map((teacher) => (
                  <option
                    key={teacher.uid}
                    value={teacher.uid}
                  >
                    {teacher.fullName} —{" "}
                    {teacher.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Program */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Program
              </label>

              <input
                type="text"
                value={program}
                onChange={(event) =>
                  setProgram(event.target.value)
                }
                placeholder="e.g. Quran Reading, Hifz, Tajweed"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Notes
              </label>

              <input
                type="text"
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                placeholder="Optional assignment notes"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleAssign}
              disabled={saving}
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Assigning..."
                : "Assign Teacher"}
            </button>
          </div>
        </div>

        {/* Assignment history */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Assignment History
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              All teacher-student assignments.
            </p>
          </div>

          {assignments.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No teacher assignments found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Student
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Teacher
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Program
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Assigned
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white">
                  {assignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">
                          {assignment.studentName}
                        </div>

                        <div className="text-sm text-slate-500">
                          {assignment.studentEmail}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">
                          {assignment.teacherName}
                        </div>

                        <div className="text-sm text-slate-500">
                          {assignment.teacherEmail}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {assignment.program || "—"}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            assignment.status === "ACTIVE"
                              ? "bg-green-100 text-green-700"
                              : assignment.status ===
                                "COMPLETED"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {assignment.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {assignment.assignedAt
                          ? new Date(
                              assignment.assignedAt
                            ).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

