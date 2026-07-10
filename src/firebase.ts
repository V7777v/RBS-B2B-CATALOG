// Firebase initialization for RBS B2B catalog (distributor authentication)
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: "AIzaSyBXtmBKArqyEm4dweJXQkfZbI78ezfLy8I",
  authDomain: "rbs-b2b.firebaseapp.com",
  projectId: "rbs-b2b",
  storageBucket: "rbs-b2b.firebasestorage.app",
  messagingSenderId: "224025193925",
  appId: "1:224025193925:web:7781d3d3beef7f583aafac"
};

const app = initializeApp(firebaseConfig);

// App Check (reCAPTCHA v3) — verifies requests come from this app (incl. guests),
// protecting Firestore and custom endpoints from non-app/automated clients.
export const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('6LcNEEEtAAAAAM_S4LNH8yNWXv4mCNxmTiyeYQuI'),
  isTokenAutoRefreshEnabled: true
});

export const auth = getAuth(app);
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
