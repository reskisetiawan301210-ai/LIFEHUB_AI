/**
 * auth/core.js — Authentication methods service layer.
 *
 * Wraps Firebase Auth so the rest of the app never touches the SDK
 * directly: controllers call these functions and react to store changes,
 * they don't hold Firebase auth objects themselves.
 */

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  sendPasswordResetEmail,
  signOut,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { auth, db } from '../firebase-config.js';
import { store } from '../store.js';

const googleProvider = new GoogleAuthProvider();

/** Attaches the session observer once at app boot. Call exactly one time. */
export function initAuthObserver({ onAuthenticated, onGuest, onSignedOut } = {}) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      store.set('auth', { user: null, status: 'signed-out' });
      onSignedOut?.();
      return;
    }
    const status = user.isAnonymous ? 'guest' : 'authenticated';
    store.set('auth', { user, status });
    (status === 'guest' ? onGuest : onAuthenticated)?.();
  });
}

export async function signInWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email, password, displayName) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await ensureUserProfile(credential.user, { displayName });
  return credential;
}

export async function signInWithGoogle() {
  const credential = await signInWithPopup(auth, googleProvider);
  await ensureUserProfile(credential.user);
  return credential;
}

export async function signInAsGuest() {
  return signInAnonymously(auth);
}

export async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

export async function logOut() {
  return signOut(auth);
}

/** Creates the /users/{uid} profile document on first sign-in. */
async function ensureUserProfile(user, extra = {}) {
  await setDoc(
    doc(db, 'users', user.uid),
    {
      displayName: extra.displayName ?? user.displayName ?? '',
      email: user.email ?? null,
      photoURL: user.photoURL ?? null,
      createdAt: serverTimestamp(),
      role: 'member',
    },
    { merge: true }
  );
}
