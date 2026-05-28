/**
 * DEPRECATED: Firebase Authentication has been completely replaced by Supabase client at '@/lib/supabaseClient'.
 * This file is deprecated and preserved only for backwards-compatible Firestore database operations.
 */
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyFakeKeyForPrerenderingBuildTimeOnly",
  authDomain: "viam-fake.firebaseapp.com",
  projectId: "viam-fake",
  storageBucket: "viam-fake.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1091361134364:web:fakeapp12345",
};

// Initialize Firebase singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = null as any; // Firebase Auth is deprecated and replaced by Supabase
export default app;
