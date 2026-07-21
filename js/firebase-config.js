/**
 * firebase-config.js — Core Firebase initialization wrapper.
 *
 * Every other module imports `auth`, `db`, and `storage` from here rather
 * than calling `initializeApp` itself, so there is exactly one Firebase
 * app instance for the whole client.
 *
 * Config values are read from Vite-style env vars at build time
 * (VITE_FIREBASE_*). Never hardcode secrets here — this file is safe to
 * commit because Firebase web config is not a secret, but keep it out of
 * source control anyway if your deploy pipeline injects it differently.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';

const firebaseConfig = {
  apiKey: "AIzaSyDofwu-I-i2SasB6_JKbUxc_SG042JBinI",
  authDomain: "lifehub-ai-6bdca.firebaseapp.com",
  projectId: "lifehub-ai-6bdca",
  storageBucket: "lifehub-ai-6bdca.firebasestorage.app",
  messagingSenderId: "539386496040",
  appId: "1:539386496040:web:e6789e4c0c363e83de211d",
  measurementId: "G-CW5M8SGPGL"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

/* -------------------------------------------------------------------------
   Firestore security rules (deploy via `firebase deploy --only firestore:rules`)
   Kept here as inline documentation — the authoritative copy belongs in
   /firestore.rules at the project root once the CLI project is initialized.

   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{collection}/{docId} {
         allow read, update, delete: if request.auth != null
           && request.auth.uid == resource.data.userId;
         allow create: if request.auth != null
           && request.auth.uid == request.resource.data.userId;
       }
     }
   }
   ------------------------------------------------------------------------- */
