import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Public web configuration for the existing pundag-premier-league project.
const firebaseConfig = {
  apiKey: "AIzaSyB4pV8z6KqO0ixeuPClgY6fHDvm-o5ApjE",
  authDomain: "pundag-premier-league.firebaseapp.com",
  projectId: "pundag-premier-league",
  storageBucket: "pundag-premier-league.firebasestorage.app",
  messagingSenderId: "318036804333",
  appId: "1:318036804333:web:e4df48962c2bf0b2edc2e4"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
