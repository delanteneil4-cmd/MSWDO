import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBmImNKZUNmTM6ipoEsL1reJxCKcB-KSf4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dbrvs-portal.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dbrvs-portal",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dbrvs-portal.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "301643797501",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:301643797501:web:9fa0b68a39dd825ea07f94",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-WDGKMTB6PD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db, firebaseConfig };
