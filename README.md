# LifeHub AI — Project Scaffold

This is the stage-1 scaffold: folder structure, design system, app shell,
auth flow, state store, service layer (with retry/backoff), and empty
feature-module shells for every hub in the brief. No hub's business logic
is implemented yet — each `features/*.js` file has `// TODO` markers
pointing at what it still needs.

## What's real right now
- Full "Orbit Glass" design system (`css/styles.css`) — dark glassmorphism,
  per-hub ambient color, skeleton/empty states, responsive shell.
- Landing/auth portal (`index.html`) wired to Firebase Auth: email/password,
  Google, guest, and password reset all work once Firebase config is filled in.
- Dashboard shell (`dashboard.html`): sidebar, topbar, theme toggle, widget
  grid — populated with empty-state placeholders, not live data yet.
- Centralized store (`js/store.js`), a hub router (`js/app.js`), and a
  shared HTTP client with exponential backoff + 429 handling
  (`js/services/_httpClient.js`) that all four API services use.
- PWA manifest + service worker with app-shell precaching and an offline
  navigation fallback.

## What's still a TODO
- Every collection's CRUD UI (expenses, tasks, notes, reminders, etc.)
- Chart.js analytics in the Finance hub
- The AI Assistant chat window and voice input
- Music hub (YouTube Iframe Player integration) and Movie hub (TMDB grid + trailers)
- QR tools and password generator UI
- Real PNG icons in `assets/icons/` (only a placeholder SVG source exists)

## Setup
1. Create a Firebase project; enable Auth (Email/Password, Google, Anonymous),
   Firestore, and Storage.
2. Fill in `js/firebase-config.js`'s env var names via your bundler
   (`VITE_FIREBASE_*`) — do not hardcode real keys into source control.
3. Deploy `firestore.rules` and `storage.rules` (note the comment in
   `firestore.rules` — Firestore's rules language needs one explicit
   `match` block per collection; the file documents the shared condition
   to copy into each).
4. Set `VITE_GEMINI_API_KEY`, `VITE_YOUTUBE_API_KEY`, `VITE_TMDB_API_KEY`,
   `VITE_WEATHER_API_KEY` in your deploy environment. **Gemini's key should
   be proxied server-side** (e.g. a Cloud Function) rather than shipped to
   the client — `aiService.js` already assumes a `/api/gemini` proxy route.
5. Serve the directory with any static host (Firebase Hosting, Vercel,
   etc.) — there's no build step required to see the shell running, since
   everything is vanilla ES modules + the Tailwind CDN script.

## Suggested build order for stage 2
1. Productivity hub (notes + tasks) — simplest CRUD, good template for the rest.
2. Finance hub — highest value, exercises Chart.js + Gemini narration.
3. Tools & Weather — small, self-contained.
4. AI Assistant — needs the Gemini proxy route decided first.
5. Music and Movies — largest surfaces, each needs its own player integration.
