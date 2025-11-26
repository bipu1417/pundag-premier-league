// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  doc
} from "firebase/firestore";

import { getStorage } from "firebase/storage"; // ✅ FIXED: Added storage

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB4pV8z6KqO0ixeuPClgY6fHDvm-o5ApjE",
  authDomain: "pundag-premier-league.firebaseapp.com",
  projectId: "pundag-premier-league",
  storageBucket: "pundag-premier-league.appspot.com",  // ✅ FIXED: corrected domain
  messagingSenderId: "318036804333",
  appId: "1:318036804333:web:e4df48962c2bf0b2edc2e4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firestore
export const db = getFirestore(app);

// Storage
export const storage = getStorage(app);  // ✅ FIXED: Now available

// Export Firestore helpers
export { collection, addDoc, getDocs, query, orderBy, getDoc, onSnapshot, deleteDoc, doc };
