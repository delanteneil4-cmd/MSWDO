import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBmImNKZUNmTM6ipoEsL1reJxCKcB-KSf4",
  authDomain: "dbrvs-portal.firebaseapp.com",
  projectId: "dbrvs-portal",
  storageBucket: "dbrvs-portal.firebasestorage.app",
  messagingSenderId: "301643797501",
  appId: "1:301643797501:web:9fa0b68a39dd825ea07f94",
  measurementId: "G-WDGKMTB6PD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, analytics, auth, db };
