import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

// --- FIREBASE CONFIG ---
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

// Initialize Firestore with persistent offline cache (IndexedDB).
// persistentMultipleTabManager allows multiple browser tabs to share the cache
// without conflicts — safe for doctors who open multiple tabs simultaneously.
// This does NOT intercept or cache Firestore network requests; it only manages
// local IndexedDB persistence via the official Firestore SDK mechanism.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const auth = getAuth(app);

export default app;
