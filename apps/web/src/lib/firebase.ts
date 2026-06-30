import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Public by design (Firebase web config is safe to ship to the browser).
const firebaseConfig = {
  apiKey: "AIzaSyA-fE99V9D4sSc-_IN7Fwy5XPsiaptpm00",
  authDomain: "luxar-firebase.firebaseapp.com",
  projectId: "luxar-firebase",
  storageBucket: "luxar-firebase.firebasestorage.app",
  messagingSenderId: "54382945497",
  appId: "1:54382945497:web:500e92aebd0e4c33c40ac8",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();

/** True only when the Firebase env vars are actually filled in. */
export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);
