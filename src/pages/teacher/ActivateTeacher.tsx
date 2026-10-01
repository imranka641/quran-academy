
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

interface TeacherInvite {
  fullName: string;
  email: string;
  phone?: string;
  gender?: "MALE" | "FEMALE" | null;
  experienceYears?: number;
  specialization?: string[];
  bio?: string;
  status: "PENDING" | "ACCEPTED" | "CANCELLED";
}

export default function ActivateTeacher() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token");

  const [invite, setInvite] = useState<TeacherInvite | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadInvitation() {
      if (!token) {
        setError("Invalid activation link.");
        setLoadingInvite(false);
        return;
      }

      try {
        const inviteRef = doc(
          db,
          "teacherInvites",
          token
        );

        const snapshot = await getDoc(inviteRef);

        if (!snapshot.exists()) {
          setError("This teacher invitation does not exist.");
          setLoadingInvite(false);
          return;
        }

        const data = snapshot.data() as TeacherInvite;

        if (data.status !== "PENDING") {
          setError(
            "This invitation has already been used or cancelled."
          );
          setLoadingInvite(false);
          return;
        }

        setInvite(data);
      } catch (err) {
        console.error("Failed to load invitation:", err);

        setError(
          "Unable to load this invitation. Please contact the academy administrator."
        );
      } finally {
        setLoadingInvite(false);
      }
    }

    loadInvitation();
  }, [token]);

  async function handleActivate(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!token || !invite) {
      setError("Invalid teacher invitation.");
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must contain at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      /*
       * Create the teacher's Firebase Authentication account.
       */
      const credential =
        await createUserWithEmailAndPassword(
          auth,
          invite.email,
          password
        );

      const user = credential.user;

      await updateProfile(user, {
        displayName: invite.fullName,
      });

      const userRef = doc(
        db,
        "users",
        user.uid
      );

      const teacherProfileRef = doc(
        db,
        "teacherProfiles",
        user.uid
      );

      const inviteRef = doc(
        db,
        "teacherInvites",
        token
      );

      /*
       * Create the permanent teacher profile and
       * consume the invitation atomically.
       */
      await runTransaction(db, async (transaction) => {
        const currentInvite =
          await transaction.get(inviteRef);

        if (!currentInvite.exists()) {
          throw new Error(
            "Teacher invitation no longer exists."
          );
        }

        const currentData =
          currentInvite.data() as TeacherInvite;

        if (currentData.status !== "PENDING") {
          throw new Error(
            "This teacher invitation has already been used."
          );
        }

        transaction.set(userRef, {
          uid: user.uid,
          inviteToken: token,
          email: invite.email,
          displayName: invite.fullName,
          role: "TEACHER",
          phone: invite.phone || "",
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        transaction.set(teacherProfileRef, {
          uid: user.uid,
          inviteToken: token,
          fullName: invite.fullName,
          email: invite.email,
          phone: invite.phone || "",
          gender: invite.gender || null,
          experienceYears:
            invite.experienceYears || 0,
          specialization:
            invite.specialization || [],
          bio: invite.bio || "",
          status: "ACTIVE",
          joinedAt: new Date().toISOString(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        transaction.update(inviteRef, {
          status: "ACCEPTED",
          acceptedByUid: user.uid,
          acceptedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      setSuccess(true);
    } catch (err: any) {
      console.error("Teacher activation failed:", err);

      if (
        err?.code === "auth/email-already-in-use"
      ) {
        setError(
          "This email already has a Firebase account. Please contact the academy administrator."
        );
      } else if (
        err?.code === "auth/invalid-email"
      ) {
        setError("The invitation contains an invalid email.");
      } else if (
        err?.code === "auth/weak-password"
      ) {
        setError(
          "The password is too weak. Please choose a stronger password."
        );
      } else {
        setError(
          err?.message ||
            "Teacher activation failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  if (loadingInvite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">
          Loading invitation...
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-lg rounded-xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Teacher Account Activated
          </h1>

          <p className="mt-3 text-slate-600">
            Your teacher account has been created successfully.
            You can now log in to the Quran Academy.
          </p>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-lg rounded-xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-red-600">
            Invalid Invitation
          </h1>

          <p className="mt-3 text-slate-600">
            {error ||
              "This teacher invitation is not available."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-lg rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          Activate Teacher Account
        </h1>

        <p className="mt-2 text-slate-600">
          Welcome to Quran Academy. Complete your account setup
          below.
        </p>

        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="font-semibold text-slate-900">
            {invite.fullName}
          </p>

          <p className="mt-1 text-sm text-slate-600">
            {invite.email}
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form
          onSubmit={handleActivate}
          className="mt-6 space-y-5"
        >
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Password *
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              minLength={6}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Confirm Password *
            </label>

            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              minLength={6}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              placeholder="Repeat your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Activating Account..."
              : "Activate Teacher Account"}
          </button>
        </form>
      </div>
    </div>
  );
}

