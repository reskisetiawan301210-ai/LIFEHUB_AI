// Jika auth.js ada di dalam folder 'auth/', gunakan '../supabase.js'
// Jika auth.js ada di folder utama (root), ubah jadi './supabase.js'
import { supabase } from '../supabase.js';

export const AUTH_STATES = {
  INITIALIZING: 'AUTH_INITIALIZING',
  AUTHENTICATED: 'AUTHENTICATED',
  GUEST: 'GUEST',
  UNAUTHENTICATED: 'UNAUTHENTICATED'
};

export async function resolveAuthState() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (session && session.user) {
      localStorage.removeItem('lifehub_guest_mode');
      return {
        state: AUTH_STATES.AUTHENTICATED,
        user: session.user,
        isGuest: false
      };
    }
  } catch (err) {
    console.error('Auth resolution error:', err);
  }

  const isGuest = localStorage.getItem('lifehub_guest_mode') === 'true';
  if (isGuest) {
    return {
      state: AUTH_STATES.GUEST,
      user: null,
      isGuest: true
    };
  }

  return {
    state: AUTH_STATES.UNAUTHENTICATED,
    user: null,
    isGuest: false
  };
}

export function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  if (hour >= 18 && hour < 23) return 'Good evening';
  return 'Good night';
}

export function extractFirstName(fullName) {
  if (!fullName) return 'User';
  const cleaned = fullName.trim().split(' ')[0];
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}

export function resolveDisplayName(authResult) {
  if (authResult.isGuest) return 'Guest';
  
  const user = authResult.user;
  if (!user) return localStorage.getItem('lifehub_profile_name') || 'User';

  const meta = user.user_metadata || {};
  const customSaved = localStorage.getItem('lifehub_profile_name');
  const rawName = customSaved || meta.full_name || meta.name || meta.first_name || meta.displayName || user.email?.split('@')[0] || 'User';
  
  return extractFirstName(rawName);
}

export async function triggerGoogleOAuth() {
  const redirectUrl = window.location.origin + window.location.pathname.replace(/[^/]*$/, 'dashboard.html');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl
    }
  });
  if (error) {
    throw error;
  }
}

export function showGuestLockModal(featureName = 'this feature') {
  let modal = document.getElementById('guestLockModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'guestLockModal';
    modal.className = 'modal-backdrop is-active';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px;';
    modal.innerHTML = `
      <div style="background:#141418; border:1px solid rgba(255,255,255,0.15); border-radius:20px; max-width:420px; width:100%; padding:28px; text-align:center; box-shadow:0 20px 50px rgba(0,0,0,0.6); color:#f4f4f6; font-family:Inter, sans-serif;">
        <div style="width:56px; height:56px; background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.3); border-radius:16px; display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto; color:#f59e0b; font-size:24px;">
          🔒
        </div>
        <h3 id="guestLockTitle" style="font-size:20px; font-weight:700; margin-bottom:8px; font-family:'Space Grotesk', sans-serif;">Sign in to unlock feature</h3>
        <p id="guestLockDesc" style="font-size:13px; color:#9e9ea7; line-height:1.5; margin-bottom:24px;">This feature requires an authenticated account. Continue with Google or sign in to get full access.</p>
        <div style="display:flex; flex-direction:column; gap:10px;">
          <button id="guestLockGoogleBtn" style="background:#f59e0b; color:#000; font-weight:700; font-size:13px; padding:12px; border-radius:10px; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
            <svg style="width:16px; height:16px;" viewBox="0 0 24 24"><path fill="#000" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/></svg>
            Continue with Google
          </button>
          <button id="guestLockAccountBtn" style="background:rgba(255,255,255,0.05); color:#fff; font-weight:600; font-size:13px; padding:12px; border-radius:10px; border:1px solid rgba(255,255,255,0.1); cursor:pointer;">
            Sign In / Create Account
          </button>
          <button id="guestLockCancelBtn" style="background:transparent; color:#62626b; font-weight:500; font-size:12px; padding:8px; border:none; cursor:pointer;">
            Cancel
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('guestLockGoogleBtn').onclick = async () => {
      try {
        await triggerGoogleOAuth();
      } catch (err) {
        alert('Google OAuth error: ' + err.message);
      }
    };
    document.getElementById('guestLockAccountBtn').onclick = () => {
      localStorage.removeItem('lifehub_guest_mode');
      window.location.href = 'index.html';
    };
    document.getElementById('guestLockCancelBtn').onclick = () => {
      modal.classList.remove('is-active');
      modal.style.display = 'none';
    };
  }

  const titleEl = document.getElementById('guestLockTitle');
  const descEl = document.getElementById('guestLockDesc');
  if (titleEl) titleEl.textContent = `Sign in to unlock ${featureName}`;
  if (descEl) descEl.textContent = `${featureName} is available for signed-in LifeHub users.`;

  modal.style.display = 'flex';
  modal.classList.add('is-active');
}