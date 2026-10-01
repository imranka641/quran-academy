import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

interface DashboardCardData {
  title: string;
  description: string;
  to?: string;
}

const adminCards: DashboardCardData[] = [
  {
    title: "Students",
    description: "Manage academy student accounts and enrollment.",
    to: "/admin/students",
  },
  {
    title: "Teachers",
    description: "Manage teacher profiles and add teachers.",
    to: "/admin/teachers",
  },
  {
    title: "Programs",
    description: "Manage Quran learning programs.",
  },
  {
    title: "Classes",
    description: "Manage class schedules and assignments.",
  },
  {
    title: "Live Classes",
    description: "Manage live lessons and meeting links.",
  },
  {
    title: "Payments",
    description: "Review student payments and invoices.",
  },
];

const studentCards: DashboardCardData[] = [
  {
    title: "Quran Learning",
    description: "Quran reading, Tajweed, and memorization.",
  },
  {
    title: "My Classes",
    description: "View your classes and lesson schedule.",
  },
  {
    title: "Payments",
    description: "Review your payments and invoices.",
  },
];

const teacherCards: DashboardCardData[] = [
  {
    title: "My Students",
    description: "View your assigned students and their learning details.",
    to: "/teacher/dashboard",
  },
  {
    title: "My Classes",
    description: "View your classes and lesson schedule.",
  },
];

export default function Dashboard() {
  const { user, profile, logout } = useAuth();
  const isAdmin = profile?.role === "ADMIN";
  const isTeacher = profile?.role === "TEACHER";
  const cards = isAdmin
    ? adminCards
    : isTeacher
      ? teacherCards
      : studentCards;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Quran Academy
            </h1>
            <p className="text-sm text-slate-500">
              {isAdmin ? "Academy Administration" : "Learning Platform"}
            </p>
          </div>

          <button
            onClick={logout}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">
            Welcome, {profile?.displayName || user?.displayName || "User"}!
          </h2>

          <p className="mt-2 text-slate-600">
            {isAdmin
              ? "Manage academy operations from your admin dashboard."
              : isTeacher
                ? "Manage your students and teaching assignments."
              : "Your Quran learning dashboard."}
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Email</p>
              <p className="mt-1 font-medium text-slate-900">
                {user?.email || "No email"}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Role</p>
              <p className="mt-1 font-medium text-slate-900">
                {profile?.role || "No role"}
              </p>
            </div>
          </div>
        </div>

        <h2 className="mb-4 text-xl font-semibold text-slate-900">
          {isAdmin
            ? "Admin Dashboard"
            : isTeacher
              ? "Teaching Dashboard"
              : "My Learning"}
        </h2>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <DashboardCard key={card.title} {...card} />
          ))}
        </div>
      </main>
    </div>
  );
}

function DashboardCard({
  title,
  description,
  to,
}: {
  title: string;
  description: string;
  to?: string;
}) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm transition hover:shadow-md">
      <h3 className="text-lg font-semibold text-slate-900">
        {title}
      </h3>

      <p className="mt-2 text-sm text-slate-600">
        {description}
      </p>

      {to ? (
        <Link
          to={to}
          className="mt-5 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Manage
        </Link>
      ) : (
        <span className="mt-5 inline-flex text-sm font-medium text-slate-400">
          Coming soon
        </span>
      )}
    </div>
  );
}