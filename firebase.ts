// FIX: Updated to Firebase v8 namespaced API to match project dependencies.
// FIX: Switched to compat libraries to ensure v8 API surface is available.
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAXjPgIx-av7fhhco1583xJQ5gYPKAxAf0",
  authDomain: "clinicflow-368d2.firebaseapp.com",
  projectId: "clinicflow-368d2",
  storageBucket: "clinicflow-368d2.firebasestorage.app",
  messagingSenderId: "327127338870",
  appId: "1:327127338870:web:47483c1a86a2a42077f457"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const googleProvider = new firebase.auth.GoogleAuthProvider();
export const db = firebase.firestore();