// Import the functions you need from the SDKs
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getAuth,
  setPersistence,
  browserSessionPersistence,
} from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBQT_Yr2Fm-a0g6Fe2OH039jt1I67SDAko",
  authDomain: "carbookingservice-98f2a.firebaseapp.com",
  projectId: "carbookingservice-98f2a",
  storageBucket: "carbookingservice-98f2a.appspot.com",
  messagingSenderId: "247382552477",
  appId: "1:247382552477:web:fc6578c00e3c96ff25c974",
  measurementId: "G-1HGJ6EL252",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app); // Optional

// Initialize Auth
const auth = getAuth(app);

// Force session-only login (no auto-login on refresh)
setPersistence(auth, browserSessionPersistence)
  .then(() => {
    console.log("🔐 Auth persistence set to session-only.");
  })
  .catch((error) => {
    console.error("❌ Failed to set auth persistence:", error);
  });

export { auth, app };
