
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../../lib/firebase";
import { useAuth } from "../../contexts/AuthContext";
import type { TeacherAssignment } from "../../types/assignment";

export default function TeacherDashboard() {
  const { user, profile } = useAuth();

  const [assignments, setAssignments] = useState<
    TeacherAssignment[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStudents() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setError("");

        const assignmentsQuery = query(
          collection(db, "teacherAssignments"),
          where("teacherUid", "==", user.uid),
          orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(assignmentsQuery);

        const data = snapshot.docs.map(
          (assignmentDoc) =>
            ({
              id: assignmentDoc.id,
              ...assignmentDoc.data(),
            }) as TeacherAssignment
        );

        setAssignments(data);
      } catch (err) {
        console.error(err);

        const code =
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          typeof err.code === "string"
            ? err.code
            : "";

        if (code === "permission-denied") {
          setError(
            "Firestore denied access to your assignments. Confirm the teacher-scoped rules are deployed to quran-academy-ef3a2 and that each assignment uses your signed-in teacher UID."
          );
        } else if (code === "failed-precondition") {
          setError(
            "This Firestore query needs an index. Follow the index link in the browser console and wait until the index is ready."
          );
        } else {
          setError("Unable to load your students. Check your connection and try again.");
        }
      } finally {
        setLoading(false);
      }
    }

    loadStudents();
  }, [user]);

  const activeAssignments = useMemo(
    () =>
      assignments.filter(
        (assignment) => assignment.status === "ACTIVE"
      ),
    [assignments]
  );

  const previousAssignments = useMemo(
    () =>
      assignments.filter(
        (assignment) => assignment.status !== "ACTIVE"
      ),
    [assignments]
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div>
          <p className="text-sm font-medium text-emerald-600">
            Teacher Dashboard
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Welcome, {profile?.displayName || "Teacher"}
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Manage your assigned Quran Academy students.
          </p>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">
              Active Students
            </p>

            <p className="mt-1 text-3xl font-bold text-slate-900">
              {activeAssignments.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">
              Assignment History
            </p>

            <p className="mt-1 text-3xl font-bold text-slate-900">
              {assignments.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">
              Previous Assignments
            </p>

            <p className="mt-1 text-3xl font-bold text-slate-900">
              {previousAssignments.length}
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* My Students */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                My Students
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Students currently assigned to you.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-10 text-center">
              <p className="text-sm text-slate-600">
                Loading your students...
              </p>
            </div>
          ) : activeAssignments.length === 0 ? (
            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-10 text-center">
              <div className="text-4xl">
                📖
              </div>

              <h3 className="mt-4 font-semibold text-slate-900">
                No active students
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                The academy administrator has not assigned any
                active students to you yet.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {activeAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl">
                      👤
                    </div>

                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      ACTIVE
                    </span>
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-slate-900">
                    {assignment.studentName}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {assignment.studentEmail}
                  </p>

                  {assignment.program && (
                    <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Program
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {assignment.program}
                      </p>
                    </div>
                  )}

                  <div className="mt-5">
                    <Link
                      to={`/teacher/students/${assignment.studentUid}`}
                      className="block w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      Open Student
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Previous assignments */}
        {previousAssignments.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-bold text-slate-900">
              Assignment History
            </h2>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Student
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

                  <tbody className="divide-y divide-slate-200">
                    {previousAssignments.map(
                      (assignment) => (
                        <tr key={assignment.id}>
                          <td className="px-6 py-4">
                            <p className="font-medium text-slate-900">
                              {assignment.studentName}
                            </p>

                            <p className="text-xs text-slate-500">
                              {assignment.studentEmail}
                            </p>
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-700">
                            {assignment.program || "—"}
                          </td>

                          <td className="px-6 py-4">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              {assignment.status}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-500">
                            {new Date(
                              assignment.assignedAt
                            ).toLocaleDateString()}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

