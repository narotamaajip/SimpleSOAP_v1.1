import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// --- PASTE YOUR FIREBASE CONFIG HERE ---
// You can get this from Firebase Console -> Project Settings -> General -> Your Apps
const firebaseConfig = {
  apiKey: "AIzaSyCgcCj6HKkR_FnoTtQg67qFfM0Teh8PwmU",
  authDomain: "simplesoap-1101f.firebaseapp.com",
  projectId: "simplesoap-1101f",
  storageBucket: "simplesoap-1101f.firebasestorage.app",
  messagingSenderId: "269433770253",
  appId: "1:269433770253:web:c3f1ce724150aee08ba044"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;
