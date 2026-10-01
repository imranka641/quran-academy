import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";
import type { UserProfile } from "../types/user";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoadError: boolean;

  register: (
    name: string,
    email: string,
    password: string
  ) => Promise<void>;

  login: (
    email: string,
    password: string
  ) => Promise<void>;

  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [profileLoadError, setProfileLoadError] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        try {
          setLoading(true);
          setProfileLoadError(false);
          setUser(firebaseUser);

          if (!firebaseUser) {
            setProfile(null);
            return;
          }

          const userRef = doc(db, "users", firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            setProfile(userSnap.data() as UserProfile);
          } else {
            const now = new Date().toISOString();
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email ?? "",
              displayName: firebaseUser.displayName || "Student",
              role: "STUDENT",
              isActive: true,
              createdAt: now,
              updatedAt: now,
            };

            await setDoc(userRef, {
              ...newProfile,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });

            setProfile(newProfile);
          }
        } catch (error) {
          console.error(
            "Failed to load user profile:",
            error
          );
          setProfile(null);
          setProfileLoadError(true);
        } finally {
          setLoading(false);
        }
      }
    );

    return unsubscribe;
  }, []);

  async function register(
    name: string,
    email: string,
    password: string
  ) {
    const credential =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    await updateProfile(credential.user, {
      displayName: name,
    });

    /*
     * IMPORTANT:
     *
     * Public registration must NEVER allow users to choose
     * ADMIN or TEACHER themselves.
     *
     * For the first development version we create accounts
     * as STUDENT.
     *
     * Later, the Admin will create/invite teachers,
     * students and parents.
     */

    const now = new Date().toISOString();

    const profile: UserProfile = {
      uid: credential.user.uid,
      email,
      displayName: name,
      role: "STUDENT",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(
      doc(db, "users", credential.user.uid),
      {
        ...profile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    );

    setProfile(profile);
  }

  async function login(
    email: string,
    password: string
  ) {
    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
  }

  async function logout() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        profileLoadError,
        register,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}