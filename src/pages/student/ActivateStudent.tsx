
import { type FormEvent, useEffect, useState } from "react";
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
import { useNavigate, useSearchParams } from "react-router-dom";
import { auth, db } from "../../lib/firebase";

interface StudentInvite {
  fullName: string;
  email: string;
  phone?: string;
  gender?: "MALE" | "FEMALE";
  dateOfBirth?: string;
  parentName?: string;
  parentPhone?: string;
  level?: string;
  program?: string;
  status: "PENDING" | "ACCEPTED";
}

export default function ActivateStudent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token");

  const [invite, setInvite] = useState<StudentInvite | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    async function loadInvite() {
      if (!token) {
        setError("Invalid activation link.");
        setLoading(false);
        return;
      }

      try {
        const inviteRef = doc(db, "studentInvites", token);
        const inviteSnap = await getDoc(inviteRef);

        if (!inviteSnap.exists()) {
          setError("This student invitation does not exist.");
          setLoading(false);
          return;
        }

        const data = inviteSnap.data() as StudentInvite;

        if (data.status !== "PENDING") {
          setError(
            "This invitation has already been used or is no longer active."
          );
          setLoading(false);
          return;
        }

        setInvite(data);
      } catch (err) {
        console.error(err);
        setError(
          "Unable to load the invitation. Please contact the academy administrator."
        );
      } finally {
        setLoading(false);
      }
    }

    loadInvite();
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !invite) {
      setError("Invalid activation request.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setActivating(true);
    setError("");

    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        invite.email,
        password
      );

      const user = credential.user;

      await updateProfile(user, {
        displayName: invite.fullName,
      });

      const userRef = doc(db, "users", user.uid);
      const studentRef = doc(db, "studentProfiles", user.uid);
      const inviteRef = doc(db, "studentInvites", token);

      await runTransaction(db, async (transaction) => {
        const currentInvite = await transaction.get(inviteRef);

        if (!currentInvite.exists()) {
          throw new Error("Student invitation no longer exists.");
        }

        const currentData = currentInvite.data();

        if (currentData.status !== "PENDING") {
          throw new Error("This invitation has already been used.");
        }

        transaction.set(userRef, {
          uid: user.uid,
          email: invite.email,
          displayName: invite.fullName,
          role: "STUDENT",
          phone: invite.phone || "",
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        transaction.set(studentRef, {
          uid: user.uid,
          inviteToken: token,
          fullName: invite.fullName,
          email: invite.email,
          phone: invite.phone || "",
          gender: invite.gender || "",
          dateOfBirth: invite.dateOfBirth || "",
          parentName: invite.parentName || "",
          parentPhone: invite.parentPhone || "",
          level: invite.level || "",
          program: invite.program || "",
          status: "ACTIVE",
          joinedAt: serverTimestamp(),
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

      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 2000);
    } catch (err: unknown) {
      console.error(err);

      if (
        err instanceof Error &&
        err.message.includes("already-in-use")
      ) {
        setError(
          "This email already has a Firebase account. Please use the login page."
        );
      } else if (
        err instanceof Error &&
        err.message.includes("already-exists")
      ) {
        setError("This student account already exists.");
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to activate the student account."
        );
      }
    } finally {
      setActivating(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-lg font-semibold text-slate-900">
            Loading invitation...
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Please wait.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-slate-200 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700 text-2xl">
            ✓
          </div>

          <h1 className="mt-5 text-2xl font-bold text-slate-900">
            Account Activated
          </h1>

          <p className="mt-3 text-slate-600">
            Your student account has been created successfully.
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Redirecting you to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-slate-200 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 text-2xl">
            !
          </div>

          <h1 className="mt-5 text-xl font-bold text-slate-900">
            Activation Failed
          </h1>

          <p className="mt-3 text-sm text-red-600">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-2xl">
            📖
          </div>

          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Activate Student Account
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Create your password to access the Quran Academy.
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Student
          </p>

          <p className="mt-1 font-semibold text-slate-900">
            {invite?.fullName}
          </p>

          <p className="mt-1 text-sm text-slate-600">
            {invite?.email}
          </p>

          {invite?.program && (
            <p className="mt-2 text-sm text-slate-600">
              Program:{" "}
              <span className="font-medium text-slate-900">
                {invite.program}
              </span>
            </p>
          )}
        </div>

        {error && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              minLength={6}
              required
              disabled={activating}
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-slate-700"
            >
              Confirm Password
            </label>

            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              placeholder="Confirm password"
              minLength={6}
              required
              disabled={activating}
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
            />
          </div>

          <button
            type="submit"
            disabled={activating}
            className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {activating
              ? "Activating Account..."
              : "Activate Student Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Your account will be connected to the Quran Academy after
          activation.
        </p>
      </div>
    </div>
  );
}

