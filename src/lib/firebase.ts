// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAsycb-cjsGz61b7OIvZvvI48F5CEkMue8",
  authDomain: "quran-academy-ef3a2.firebaseapp.com",
  projectId: "quran-academy-ef3a2",
  storageBucket: "quran-academy-ef3a2.firebasestorage.app",
  messagingSenderId: "767436583682",
  appId: "1:767436583682:web:a023c021fc95c31193481b",
  measurementId: "G-EMTCBBKXR2"
};
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(
  app,
  "us-central1"
);
export default app;