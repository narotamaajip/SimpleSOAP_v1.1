// Re-export from src/lib/firebase with offline persistence
export { db, auth, default } from "./lib/firebase";

// Preserved for tooling/scripts reading firebaseConfig directly:
export const firebaseConfig = {
  apiKey: "AIzaSyCgcCj6HKkR_FnoTtQg67qFfM0Teh8PwmU",
  authDomain: "simplesoap-1101f.firebaseapp.com",
  projectId: "simplesoap-1101f",
  storageBucket: "simplesoap-1101f.firebasestorage.app",
  messagingSenderId: "269433770253",
  appId: "1:269433770253:web:c3f1ce724150aee08ba044"
};

