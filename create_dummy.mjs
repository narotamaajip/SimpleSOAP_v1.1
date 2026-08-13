import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCgcCj6HKkR_FnoTtQg67qFfM0Teh8PwmU",
  authDomain: "simplesoap-1101f.firebaseapp.com",
  projectId: "simplesoap-1101f",
  storageBucket: "simplesoap-1101f.firebasestorage.app",
  messagingSenderId: "269433770253",
  appId: "1:269433770253:web:c3f1ce724150aee08ba044"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createDummy() {
  try {
    console.log("Creating dummy user in Auth...");
    const userCredential = await createUserWithEmailAndPassword(auth, "dummy@dokter.com", "password123");
    const user = userCredential.user;
    
    console.log("Creating profile in Firestore...");
    const profile = { 
      name: "dr. Dummy Tester, Sp.PD", 
      credentials: "SIP.123.456", 
      specialty: "Penyakit Dalam", 
      hospital: "RSUD Dummy", 
      ward: "Bangsal Anggrek", 
      email: "dummy@dokter.com",
      status: 'approved'
    };
    
    await setDoc(doc(db, 'doctors', user.uid), profile);
    console.log("Successfully created dummy user!");
    process.exit(0);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log("Dummy user already exists. It should work now.");
      process.exit(0);
    } else {
      console.error("Error:", error);
      process.exit(1);
    }
  }
}

createDummy();
