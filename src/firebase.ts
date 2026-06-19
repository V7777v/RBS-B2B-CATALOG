// Firebase initialization for RBS B2B catalog (distributor authentication)
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBXtmBKArqyEm4dweJXQkfZbI78ezfLy8I",
  authDomain: "rbs-b2b.firebaseapp.com",
  projectId: "rbs-b2b",
  storageBucket: "rbs-b2b.firebasestorage.app",
  messagingSenderId: "224025193925",
  appId: "1:224025193925:web:7781d3d3beef7f583aafac"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
