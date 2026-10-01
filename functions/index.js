const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {getAuth} = require("firebase-admin/auth");
const {
  getFirestore,
  FieldValue,
} = require("firebase-admin/firestore");

initializeApp();

const db = getFirestore();
const adminAuth = getAuth();

exports.createTeacher = onCall(
    {
      region: "us-central1",
      cors: ["http://localhost:5174"],
    },
    async (request) => {
    // 1. Authentication
      if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "You must be logged in.",
        );
      }

      // 2. Verify ADMIN role
      const callerUid = request.auth.uid;

      const callerSnap = await db
          .collection("users")
          .doc(callerUid)
          .get();

      if (!callerSnap.exists) {
        throw new HttpsError(
            "permission-denied",
            "Admin profile was not found.",
        );
      }

      const callerData = callerSnap.data();

      if (callerData.role !== "ADMIN") {
        throw new HttpsError(
            "permission-denied",
            "Only administrators can create teachers.",
        );
      }

      // 3. Validate request
      const data = request.data || {};

      const fullName =
      typeof data.fullName === "string" ?
        data.fullName.trim() :
        "";

      const email =
      typeof data.email === "string" ?
        data.email.trim().toLowerCase() :
        "";

      const password =
      typeof data.password === "string" ?
        data.password :
        "";

      const phone =
      typeof data.phone === "string" ?
        data.phone.trim() :
        "";

      const bio =
      typeof data.bio === "string" ?
        data.bio.trim() :
        "";

      const gender =
      data.gender === "MALE" ||
      data.gender === "FEMALE" ?
        data.gender :
        null;

      const specialization = Array.isArray(
          data.specialization,
      ) ?
      data.specialization
          .filter(
              (item) => typeof item === "string",
          )
          .map((item) => item.trim())
          .filter(Boolean) :
      [];

      const experienceYears =
      typeof data.experienceYears === "number" &&
      Number.isFinite(data.experienceYears) &&
      data.experienceYears >= 0 ?
        Math.floor(data.experienceYears) :
        0;

      if (!fullName) {
        throw new HttpsError(
            "invalid-argument",
            "Teacher name is required.",
        );
      }

      if (!email) {
        throw new HttpsError(
            "invalid-argument",
            "Teacher email is required.",
        );
      }

      if (password.length < 6) {
        throw new HttpsError(
            "invalid-argument",
            "Password must contain at least 6 characters.",
        );
      }

      // 4. Create Firebase Authentication account
      let teacherUser;

      try {
        teacherUser = await adminAuth.createUser({
          email,
          password,
          displayName: fullName,
        });
      } catch (error) {
        if (
          error &&
        error.code === "auth/email-already-exists"
        ) {
          throw new HttpsError(
              "already-exists",
              "A Firebase account with this email already exists.",
          );
        }

        console.error(
            "Failed to create teacher account:",
            error,
        );

        throw new HttpsError(
            "internal",
            "Failed to create teacher account.",
        );
      }

      const uid = teacherUser.uid;
      const now = new Date().toISOString();

      // 5. Common user profile
      const userProfile = {
        uid,
        email,
        displayName: fullName,
        role: "TEACHER",
        isActive: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      // 6. Teacher profile
      const teacherProfile = {
        uid,
        fullName,
        email,
        phone,
        gender,
        specialization,
        experienceYears,
        bio,
        status: "ACTIVE",
        joinedAt: now,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      // 7. Create Firestore documents
      try {
        await db.runTransaction(async (transaction) => {
          transaction.set(
              db.collection("users").doc(uid),
              userProfile,
          );

          transaction.set(
              db
                  .collection("teacherProfiles")
                  .doc(uid),
              teacherProfile,
          );
        });
      } catch (error) {
      // Clean up Auth account if Firestore fails
        try {
          await adminAuth.deleteUser(uid);
        } catch (cleanupError) {
          console.error(
              "Failed to clean up teacher Auth account:",
              cleanupError,
          );
        }

        console.error(
            "Failed to create teacher profiles:",
            error,
        );

        throw new HttpsError(
            "internal",
            "Teacher account could not be completed.",
        );
      }

      // 8. Success
      return {
        success: true,
        uid,
        email,
        message: "Teacher created successfully.",
      };
    },
);
