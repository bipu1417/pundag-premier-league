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
  
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firestore
export const db = getFirestore(app);

// Storage
export const storage = getStorage(app);  // ✅ FIXED: Now available

// Export Firestore helpers
export { collection, addDoc, getDocs, query, orderBy, getDoc, onSnapshot, deleteDoc, doc };
