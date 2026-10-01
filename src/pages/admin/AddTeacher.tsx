
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  gender: "" | "MALE" | "FEMALE";
  experienceYears: string;
  specialization: string;
  bio: string;
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

export default function AddTeacher() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    phone: "",
    gender: "",
    experienceYears: "",
    specialization: "",
    bio: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activationLink, setActivationLink] = useState("");

  function handleChange(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
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
    setActivationLink("");

    const fullName = formData.fullName.trim();
    const email = formData.email.trim().toLowerCase();
    const phone = formData.phone.trim();
    const bio = formData.bio.trim();

    const specialization = formData.specialization
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const experienceYears = Number(
      formData.experienceYears || 0
    );

    if (!fullName) {
      setError("Teacher name is required.");
      return;
    }

    if (!email) {
      setError("Teacher email is required.");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (
      !Number.isFinite(experienceYears) ||
      experienceYears < 0
    ) {
      setError("Experience years must be a valid positive number.");
      return;
    }

    setLoading(true);

    try {
      /*
       * The token is intentionally generated in the browser.
       *
       * It is long and random enough to function as an invitation
       * secret. It is also used as the Firestore document ID so
       * the teacher can retrieve the invitation later.
       */
      const token = generateToken();

      const inviteRef = doc(
        db,
        "teacherInvites",
        token
      );

      await setDoc(inviteRef, {
        fullName,
        email,
        phone,
        gender: formData.gender || null,
        experienceYears: Math.floor(experienceYears),
        specialization,
        bio,

        status: "PENDING",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        acceptedByUid: null,
        acceptedAt: null,
      });

      const link = `${window.location.origin}/teacher/activate?token=${encodeURIComponent(
        token
      )}`;

      setActivationLink(link);
    } catch (err) {
      console.error("Failed to create teacher invitation:", err);

      setError(
        "Failed to create teacher invitation. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyActivationLink() {
    if (!activationLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(activationLink);
      alert("Activation link copied.");
    } catch (err) {
      console.error("Failed to copy activation link:", err);
      setError(
        "Could not copy automatically. Please copy the link manually."
      );
    }
  }

  if (activationLink) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-xl bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900">
                Teacher Invitation Created
              </h1>

              <p className="mt-2 text-slate-600">
                The teacher invitation has been created successfully.
                Send the activation link to the teacher.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="mb-2 text-sm font-medium text-slate-700">
                Teacher
              </p>

              <p className="font-semibold text-slate-900">
                {formData.fullName}
              </p>

              <p className="text-sm text-slate-600">
                {formData.email}
              </p>
            </div>

            <div className="mt-6">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Activation Link
              </label>

              <textarea
                readOnly
                value={activationLink}
                rows={4}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm text-slate-700 outline-none"
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={copyActivationLink}
                className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
              >
                Copy Activation Link
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin/teachers")}
                className="rounded-lg border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
              >
                Back to Teachers
              </button>

              <button
                type="button"
                onClick={() => {
                  setActivationLink("");
                  setFormData({
                    fullName: "",
                    email: "",
                    phone: "",
                    gender: "",
                    experienceYears: "",
                    specialization: "",
                    bio: "",
                  });
                }}
                className="rounded-lg border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
              >
                Add Another Teacher
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
        <div className="mb-6">
          <button
            type="button"
            onClick={() => navigate("/admin/teachers")}
            className="mb-4 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            ← Back to Teachers
          </button>

          <h1 className="text-2xl font-bold text-slate-900">
            Add Teacher
          </h1>

          <p className="mt-1 text-slate-600">
            Create a teacher invitation. The teacher will create
            their own Firebase password using the activation link.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-xl bg-white p-8 shadow-sm"
        >
          <div>
            <label
              htmlFor="fullName"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Full Name *
            </label>

            <input
              id="fullName"
              name="fullName"
              type="text"
              value={formData.fullName}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              placeholder="Teacher full name"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email *
            </label>

            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              placeholder="teacher@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Phone
            </label>

            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              placeholder="+251..."
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="gender"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Gender
              </label>

              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="">Select gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="experienceYears"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Experience (Years)
              </label>

              <input
                id="experienceYears"
                name="experienceYears"
                type="number"
                min="0"
                step="1"
                value={formData.experienceYears}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="specialization"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Specialization
            </label>

            <input
              id="specialization"
              name="specialization"
              type="text"
              value={formData.specialization}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              placeholder="Tajweed, Hifz, Quran Reading"
            />

            <p className="mt-1 text-xs text-slate-500">
              Separate multiple specializations with commas.
            </p>
          </div>

          <div>
            <label
              htmlFor="bio"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Bio
            </label>

            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={5}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              placeholder="Teacher background and experience..."
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-6">
            <button
              type="button"
              onClick={() => navigate("/admin/teachers")}
              className="rounded-lg border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Creating Invitation..."
                : "Create Teacher Invitation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

