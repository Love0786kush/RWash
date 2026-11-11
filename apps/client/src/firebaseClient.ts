/**
 * RWash Web Firebase Client Configuration
 * Project: carwash-7c308
 *
 * Client-side Firebase SDK (browser). Initializes the Firebase app and exports
 * the app instance plus commonly used services (Analytics).
 *
 * NOTE: This config is safe to expose in client-side code. Never put a
 * Firebase Admin service-account private key here — that belongs only in the
 * backend (rwash-otp-service/serviceAccountKey.json) and must stay secret.
 */

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyCr3yvn545KJwZh6zkAzHoakbbHC9k3J9g",
  authDomain: "carwash-7c308.firebaseapp.com",
  projectId: "carwash-7c308",
  storageBucket: "carwash-7c308.firebasestorage.app",
  messagingSenderId: "531658229291",
  appId: "1:531658229291:web:e553c36c9942bac1764c6e",
  measurementId: "G-3CHCXZEDK6",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Analytics (guarded so it never breaks non-browser environments)
export const analytics =
  typeof window !== "undefined" ? getAnalytics(app) : null;

export default app;

