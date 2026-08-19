/**
 * auth/core.js — Authentication methods service layer.
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
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      store.set('auth', { user: null, status: 'signed-out' });
      onSignedOut?.();
      return;
    }
    
    const status = user.isAnonymous ? 'guest' : 'authenticated';
    store.set('auth', { user, status });

    if (status === 'authenticated') {
      await ensureUserProfile(user);
      onAuthenticated?.(user);
    } else if (status === 'guest') {
      onGuest?.(user);
    }
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

/** Extracts the first name for greetings (e.g., "Siti Komilah" -> "Siti") */
export function getFirstName(user) {
  if (!user) return 'User';
  const fullName = user.displayName || user.email?.split('@')[0] || 'User';
  return fullName.trim().split(' ')[0];
}

/** Creates or updates the /users/{uid} profile document on sign-in. */
async function ensureUserProfile(user, extra = {}) {
  if (!user || user.isAnonymous) return;
  
  const nameToSave = extra.displayName || user.displayName || user.email?.split('@')[0] || '';
  
  await setDoc(
    doc(db, 'users', user.uid),
    {
      displayName: nameToSave,
      email: user.email ?? null,
      photoURL: user.photoURL ?? null,
      lastLoginAt: serverTimestamp(),
      role: 'member',
    },
    { merge: true }
  );
}