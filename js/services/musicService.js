/**
 * services/musicService.js — YouTube Data API layer & media operations.
 *
 * Search/metadata calls hit YouTube Data API v3 directly (read-only, key
 * restricted to HTTP referrers — safe for client-side use unlike Gemini).
 * Actual playback is handled by the YouTube Iframe Player API in the
 * Music hub feature module; this service only supplies track metadata.
 */

import { requestJSON } from './_httpClient.js';

const API_BASE = 'https://www.googleapis.com/youtube/v3';
const API_KEY = import.meta.env?.VITE_YOUTUBE_API_KEY ?? '';

const LOCAL_CACHE_KEY = 'lifehub:musicSearchCache';

/**
 * @param {string} query
 * @returns {Promise<Array<{videoId: string, title: string, channel: string, thumbnail: string}>>}
 */
export async function searchTracks(query) {
  const url = `${API_BASE}/search?part=snippet&type=video&videoCategoryId=10&maxResults=20&q=${encodeURIComponent(query)}&key=${API_KEY}`;

  try {
    const data = await requestJSON(url);
    const results = (data.items ?? []).map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url,
    }));
    cacheSearch(query, results);
    return results;
  } catch (err) {
    // Failure mitigation per brief: fall back to local cache, then empty grid.
    return readCachedSearch(query) ?? [];
  }
}

function cacheSearch(query, results) {
  try {
    const cache = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) ?? '{}');
    cache[query] = { results, cachedAt: Date.now() };
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(cache));
  } catch { /* cache is best-effort */ }
}

function readCachedSearch(query) {
  try {
    const cache = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) ?? '{}');
    return cache[query]?.results ?? null;
  } catch {
    return null;
  }
}

// TODO: playlist CRUD (createPlaylist, addTrackToPlaylist, toggleFavorite)
// operate against Firestore's /music_playlists collection directly — see
// features/ once that module is built, keeping Firestore writes out of
// this API-only service per the clean-architecture split in the brief.
