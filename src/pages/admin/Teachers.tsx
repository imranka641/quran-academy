import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";

import {
  Plus,
  Search,
  UserRound,
  Mail,
  Phone,
  GraduationCap,
} from "lucide-react";

import { db } from "../../lib/firebase";
import type { TeacherProfile } from "../../types/teacher";
import { useNavigate } from "react-router-dom";

export default function Teachers() {
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // ✅ FIX: initialize navigate
  const navigate = useNavigate();

  async function loadTeachers() {
    try {
      setLoading(true);

      const teachersQuery = query(
        collection(db, "teacherProfiles"),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(teachersQuery);

      const data = snapshot.docs.map(
        (doc) => doc.data() as TeacherProfile
      );

      setTeachers(data);
    } catch (error) {
      console.error("Failed to load teachers:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);

        const teachersQuery = query(
          collection(db, "teacherProfiles"),
          orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(teachersQuery);

        if (!active) return;

        const data = snapshot.docs.map(
          (doc) => doc.data() as TeacherProfile
        );

        setTeachers(data);
      } catch (error) {
        console.error("Failed to load teachers:", error);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const filteredTeachers = teachers.filter((teacher) => {
    const value = search.toLowerCase().trim();

    return (
      teacher.fullName?.toLowerCase().includes(value) ||
      teacher.email?.toLowerCase().includes(value) ||
      teacher.phone?.toLowerCase().includes(value) ||
      false
    );
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-8">

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Teachers
            </h1>

            <p className="mt-1 text-slate-600">
              Manage academy teachers and their profiles.
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 font-medium text-white transition hover:bg-slate-800"
            onClick={() => navigate("/admin/teachers/new")}
          >
            <Plus size={18} />
            Add Teacher
          </button>
        </div>

        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative">
            <Search
              size={19}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              placeholder="Search teachers..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 outline-none transition focus:border-slate-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <p className="text-slate-600">
              Loading teachers...
            </p>
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <GraduationCap
              size={42}
              className="mx-auto text-slate-400"
            />

            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              No teachers found
            </h2>

            <p className="mt-2 text-slate-600">
              Add your first teacher to the academy.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredTeachers.map((teacher) => (
              <div
                key={teacher.uid}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <UserRound
                      size={23}
                      className="text-slate-600"
                    />
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      teacher.status === "ACTIVE"
                        ? "bg-green-100 text-green-700"
                        : teacher.status === "SUSPENDED"
                        ? "bg-red-100 text-red-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {teacher.status}
                  </span>
                </div>

                <h2 className="mt-4 text-lg font-semibold text-slate-900">
                  {teacher.fullName}
                </h2>

                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Mail size={16} />
                    <span>{teacher.email}</span>
                  </div>

                  {teacher.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={16} />
                      <span>{teacher.phone}</span>
                    </div>
                  )}
                </div>

                {teacher.specialization &&
                  teacher.specialization.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {teacher.specialization.map(
                        (item) => (
                          <span
                            key={item}
                            className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700"
                          >
                            {item}
                          </span>
                        )
                      )}
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}