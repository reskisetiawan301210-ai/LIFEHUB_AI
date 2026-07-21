/**
 * services/_httpClient.js — Shared fetch wrapper for every external API.
 *
 * Not listed in the project's file tree individually, but factored out so
 * aiService / musicService / movieService / weatherService don't each
 * reimplement retry/backoff and 429 handling (the brief requires all four
 * to share this behavior — see "External API Integration Matrix").
 *
 * Exponential backoff: 300ms, 900ms, 2700ms (max 3 attempts).
 */

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 300;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {string} url
 * @param {RequestInit} options
 * @returns {Promise<any>} parsed JSON body
 * @throws {Error} with `.code` set to 'rate-limited' | 'network-error' | 'http-error'
 */
export async function requestJSON(url, options = {}) {
  let lastError;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        const retryAfter = Number(response.headers.get('retry-after')) || null;
        if (attempt < MAX_ATTEMPTS - 1) {
          await delay(retryAfter ? retryAfter * 1000 : BASE_DELAY_MS * 3 ** attempt);
          continue;
        }
        const err = new Error('Rate limited');
        err.code = 'rate-limited';
        throw err;
      }

      if (!response.ok) {
        const err = new Error(`HTTP ${response.status}`);
        err.code = 'http-error';
        err.status = response.status;
        throw err;
      }

      return await response.json();
    } catch (err) {
      lastError = err;
      if (err.code === 'rate-limited' || err.code === 'http-error') throw err;
      // Network-level failure (offline, DNS, CORS) — retry with backoff.
      if (attempt < MAX_ATTEMPTS - 1) {
        await delay(BASE_DELAY_MS * 3 ** attempt);
        continue;
      }
      const networkErr = new Error('Network request failed');
      networkErr.code = 'network-error';
      networkErr.cause = lastError;
      throw networkErr;
    }
  }

  throw lastError;
}
