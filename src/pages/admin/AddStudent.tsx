import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  gender: "" | "MALE" | "FEMALE";
  dateOfBirth: string;
  parentName: string;
  parentPhone: string;
  level: string;
  program: string;
}

function generateToken(length = 48): string {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  const randomValues = new Uint32Array(length);

  crypto.getRandomValues(randomValues);

  return Array.from(randomValues)
    .map((value) => characters[value % characters.length])
    .join("");
}

export default function AddStudent() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    phone: "",
    gender: "",
    dateOfBirth: "",
    parentName: "",
    parentPhone: "",
    level: "",
    program: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activationLink, setActivationLink] = useState("");

  function handleChange(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const fullName = formData.fullName.trim();
    const email = formData.email.trim().toLowerCase();

    if (!fullName) {
      setError("Student name is required.");
      return;
    }

    if (!email) {
      setError("Student email is required.");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const token = generateToken();

      const inviteRef = doc(
        db,
        "studentInvites",
        token
      );

      await setDoc(inviteRef, {
        fullName,
        email,
        phone: formData.phone.trim(),
        gender: formData.gender || null,
        dateOfBirth: formData.dateOfBirth || null,
        parentName: formData.parentName.trim(),
        parentPhone: formData.parentPhone.trim(),
        level: formData.level.trim(),
        program: formData.program.trim(),

        status: "PENDING",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        acceptedByUid: null,
        acceptedAt: null,
      });

      const link =
        `${window.location.origin}/student/activate?token=` +
        encodeURIComponent(token);

      setActivationLink(link);
    } catch (err) {
      console.error(
        "Failed to create student invitation:",
        err
      );

      setError(
        "Failed to create student invitation."
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!activationLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        activationLink
      );

      alert("Activation link copied.");
    } catch (err) {
      console.error(err);

      setError(
        "Could not copy automatically. Please copy it manually."
      );
    }
  }

  if (activationLink) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-xl bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">
              Student Invitation Created
            </h1>

            <p className="mt-2 text-slate-600">
              Send this activation link to the student.
            </p>

            <div className="mt-6 rounded-lg bg-slate-50 p-4">
              <p className="font-semibold">
                {formData.fullName}
              </p>

              <p className="text-sm text-slate-600">
                {formData.email}
              </p>
            </div>

            <textarea
              readOnly
              value={activationLink}
              rows={4}
              className="mt-6 w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm"
            />

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={copyLink}
                className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white"
              >
                Copy Activation Link
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate("/admin/students")
                }
                className="rounded-lg border border-slate-300 px-5 py-3"
              >
                Back to Students
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() =>
            navigate("/admin/students")
          }
          className="mb-4 text-sm font-medium text-blue-600"
        >
          ← Back to Students
        </button>

        <h1 className="text-2xl font-bold text-slate-900">
          Add Student
        </h1>

        <p className="mt-1 text-slate-600">
          Create a student invitation. The student will create
          their own password.
        </p>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-6 rounded-xl bg-white p-8 shadow-sm"
        >
          <div>
            <label className="mb-2 block text-sm font-medium">
              Full Name *
            </label>

            <input
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3"
              placeholder="Student full name"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Email *
            </label>

            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3"
              placeholder="student@example.com"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Phone
              </label>

              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Gender
              </label>

              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-4 py-3"
              >
                <option value="">Select gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Date of Birth
            </label>

            <input
              name="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-4 py-3"
            />
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h2 className="text-lg font-semibold">
              Parent / Guardian
            </h2>

            <div className="mt-4 space-y-4">
              <input
                name="parentName"
                value={formData.parentName}
                onChange={handleChange}
                placeholder="Parent / guardian name"
                className="w-full rounded-lg border border-slate-300 px-4 py-3"
              />

              <input
                name="parentPhone"
                value={formData.parentPhone}
                onChange={handleChange}
                placeholder="Parent / guardian phone"
                className="w-full rounded-lg border border-slate-300 px-4 py-3"
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Level
              </label>

              <input
                name="level"
                value={formData.level}
                onChange={handleChange}
                placeholder="Beginner"
                className="w-full rounded-lg border border-slate-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Program
              </label>

              <input
                name="program"
                value={formData.program}
                onChange={handleChange}
                placeholder="Quran Reading"
                className="w-full rounded-lg border border-slate-300 px-4 py-3"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-6">
            <button
              type="button"
              onClick={() =>
                navigate("/admin/students")
              }
              className="rounded-lg border border-slate-300 px-5 py-3"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white disabled:opacity-60"
            >
              {loading
                ? "Creating Invitation..."
                : "Create Student Invitation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}