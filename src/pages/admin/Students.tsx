
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
  updateDoc,
  doc,
} from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../../lib/firebase";
import type {
  StudentProfile,
  StudentStatus,
} from "../../types/student";

export default function Students() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | StudentStatus
  >("ALL");

  async function loadStudents() {
    setLoading(true);
    setError("");

    try {
      const studentsQuery = query(
        collection(db, "studentProfiles"),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(studentsQuery);

      const data = snapshot.docs.map(
        (studentDoc) =>
          studentDoc.data() as StudentProfile
      );

      setStudents(data);
    } catch (err) {
      console.error(err);
      setError(
        "Unable to load students. Please check your Firestore rules and connection."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return students.filter((student) => {
      const matchesSearch =
        !normalizedSearch ||
        student.fullName
          .toLowerCase()
          .includes(normalizedSearch) ||
        student.email
          .toLowerCase()
          .includes(normalizedSearch) ||
        (student.phone || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (student.program || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (student.level || "")
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "ALL" ||
        student.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [students, search, statusFilter]);

  async function changeStatus(
    student: StudentProfile,
    status: StudentStatus
  ) {
    setUpdatingUid(student.uid);
    setError("");

    try {
      await updateDoc(
        doc(db, "studentProfiles", student.uid),
        {
          status,
          updatedAt: new Date().toISOString(),
        }
      );

      setStudents((current) =>
        current.map((item) =>
          item.uid === student.uid
            ? {
                ...item,
                status,
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      );
    } catch (err) {
      console.error(err);
      setError(
        "Unable to update the student's status."
      );
    } finally {
      setUpdatingUid(null);
    }
  }

  function statusClass(status: StudentStatus) {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-700";

      case "INACTIVE":
        return "bg-slate-100 text-slate-700";

      case "SUSPENDED":
        return "bg-red-100 text-red-700";

      case "GRADUATED":
        return "bg-blue-100 text-blue-700";

      default:
        return "bg-slate-100 text-slate-700";
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Students
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Manage academy students and their enrollment status.
            </p>
          </div>

          <Link
            to="/admin/students/new"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            + Add Student
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">
              Total
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {students.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">
              Active
            </p>
            <p className="mt-1 text-2xl font-bold text-green-600">
              {
                students.filter(
                  (student) => student.status === "ACTIVE"
                ).length
              }
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">
              Suspended
            </p>
            <p className="mt-1 text-2xl font-bold text-red-600">
              {
                students.filter(
                  (student) =>
                    student.status === "SUSPENDED"
                ).length
              }
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">
              Graduated
            </p>
            <p className="mt-1 text-2xl font-bold text-blue-600">
              {
                students.filter(
                  (student) =>
                    student.status === "GRADUATED"
                ).length
              }
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row">

            <div className="flex-1">
              <label
                htmlFor="student-search"
                className="sr-only"
              >
                Search students
              </label>

              <input
                id="student-search"
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search by name, email, phone, program or level..."
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div className="md:w-48">
              <label
                htmlFor="status-filter"
                className="sr-only"
              >
                Filter by status
              </label>

              <select
                id="status-filter"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as
                      | "ALL"
                      | StudentStatus
                  )
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="ALL">
                  All statuses
                </option>
                <option value="ACTIVE">
                  Active
                </option>
                <option value="INACTIVE">
                  Inactive
                </option>
                <option value="SUSPENDED">
                  Suspended
                </option>
                <option value="GRADUATED">
                  Graduated
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {loading ? (
            <div className="p-10 text-center">
              <p className="text-sm text-slate-600">
                Loading students...
              </p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-4xl">
                📚
              </div>

              <h2 className="mt-3 font-semibold text-slate-900">
                No students found
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                {students.length === 0
                  ? "Create your first student invitation."
                  : "Try changing your search or status filter."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Student
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Program
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Level
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>

                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {filteredStudents.map((student) => (
                    <tr
                      key={student.uid}
                      className="hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-6 py-4">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {student.fullName}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {student.email}
                          </p>

                          {student.phone && (
                            <p className="mt-1 text-xs text-slate-400">
                              {student.phone}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                        {student.program || "—"}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                        {student.level || "—"}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                            student.status
                          )}`}
                        >
                          {student.status}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {student.status === "ACTIVE" ? (
                            <>
                              <button
                                type="button"
                                disabled={
                                  updatingUid === student.uid
                                }
                                onClick={() =>
                                  changeStatus(
                                    student,
                                    "INACTIVE"
                                  )
                                }
                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                              >
                                Deactivate
                              </button>

                              <button
                                type="button"
                                disabled={
                                  updatingUid === student.uid
                                }
                                onClick={() =>
                                  changeStatus(
                                    student,
                                    "SUSPENDED"
                                  )
                                }
                                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                Suspend
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled={
                                updatingUid === student.uid
                              }
                              onClick={() =>
                                changeStatus(
                                  student,
                                  "ACTIVE"
                                )
                              }
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Activate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4 text-sm text-slate-500">
          Showing {filteredStudents.length} of{" "}
          {students.length} students
        </div>
      </div>
    </div>
  );
}

