// FIX: Updated to Firebase v8 namespaced API to match project dependencies.
// FIX: Switched to compat libraries to ensure v8 API surface is available.
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCISc3FmfSp9o78f0ZbzCFJ7AzzICLaT2A",
  authDomain: "clinicflow-4dcf9.firebaseapp.com",
  projectId: "clinicflow-4dcf9",
storageBucket: "clinicflow-4dcf9.firebasestorage.app",
messagingSenderId: "363022932649",
appId: "1:363022932649:web:c50dc078133851820b27b8"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const googleProvider = new firebase.auth.GoogleAuthProvider();
export const db = firebase.firestore();