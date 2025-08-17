// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAE5mV2fPvNFnA5svhn0xYTxGOunPWpriI",
  authDomain: "aroosi-project.firebaseapp.com",
  projectId: "aroosi-project",
  storageBucket: "aroosi-project.firebasestorage.app",
  messagingSenderId: "762041256503",
  appId: "1:762041256503:web:cad42e297e8e1a29ac8db2",
  measurementId: "G-LW4V9JBD39"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };