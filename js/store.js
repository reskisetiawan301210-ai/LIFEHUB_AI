/**
 * store.js — Centralized reactive global state.
 *
 * A minimal event-driven state emitter. Every feature module reads state
 * via `store.get()` and mutates it only via `store.set()`, so the UI never
 * has more than one source of truth for auth, theme, and cached data.
 *
 * Usage:
 *   import { store } from '../store.js';
 *   store.subscribe('theme', (theme) => document.documentElement.dataset.theme = theme);
 *   store.set('theme', 'light');
 */

const STORAGE_KEY = 'lifehub:preferences';

class Store {
  #state;
  #listeners;

  constructor(initialState = {}) {
    this.#state = { ...initialState };
    this.#listeners = new Map(); // key -> Set<callback>
  }

  get(key) {
    return key ? this.#state[key] : { ...this.#state };
  }

  set(key, value) {
    const prev = this.#state[key];
    if (prev === value) return;
    this.#state[key] = value;
    this.#emit(key, value, prev);
  }

  patch(partial) {
    Object.entries(partial).forEach(([key, value]) => this.set(key, value));
  }

  subscribe(key, callback) {
    if (!this.#listeners.has(key)) this.#listeners.set(key, new Set());
    this.#listeners.get(key).add(callback);
    return () => this.#listeners.get(key)?.delete(callback);
  }

  #emit(key, value, prev) {
    this.#listeners.get(key)?.forEach((cb) => cb(value, prev));
    this.#listeners.get('*')?.forEach((cb) => cb(key, value, prev));
  }

  /** Persist a whitelisted subset of state (theme, sidebar, language) to localStorage. */
  persist(keys) {
    const snapshot = Object.fromEntries(keys.map((k) => [k, this.#state[k]]));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (err) {
      console.warn('[store] persist failed:', err);
    }
  }

  hydrate() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.patch(JSON.parse(raw));
    } catch (err) {
      console.warn('[store] hydrate failed:', err);
    }
  }
}

export const store = new Store({
  auth: { user: null, status: 'unknown' }, // 'unknown' | 'authenticated' | 'guest' | 'signed-out'
  theme: 'dark',
  language: 'en',
  sidebar: 'expanded', // 'expanded' | 'collapsed'
  activeHub: 'dashboard',
  caches: {}, // per-hub data caches (finance, notes, tasks, music, movies)
});

store.hydrate();
store.subscribe('theme', () => store.persist(['theme', 'language', 'sidebar']));
store.subscribe('sidebar', () => store.persist(['theme', 'language', 'sidebar']));
