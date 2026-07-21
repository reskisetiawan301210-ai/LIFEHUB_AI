/**
 * services/movieService.js — The Movie Database catalog integration.
 */

import { requestJSON } from './_httpClient.js';

const API_BASE = 'https://api.themoviedb.org/3';
const API_KEY = import.meta.env?.VITE_TMDB_API_KEY ?? '';
const IMG_BASE = 'https://image.tmdb.org/t/p/w500';

export async function searchMovies(query) {
  const url = `${API_BASE}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;
  try {
    const data = await requestJSON(url);
    return (data.results ?? []).map(toMovieCard);
  } catch (err) {
    return []; // UI shows the static fallback card visualizer (see ui.js empty state)
  }
}

export async function getTrending(window = 'week') {
  const url = `${API_BASE}/trending/movie/${window}?api_key=${API_KEY}`;
  try {
    const data = await requestJSON(url);
    return (data.results ?? []).map(toMovieCard);
  } catch (err) {
    return [];
  }
}

export async function getMovieDetail(tmdbId) {
  const url = `${API_BASE}/movie/${tmdbId}?api_key=${API_KEY}&append_to_response=videos`;
  const data = await requestJSON(url);
  const trailer = (data.videos?.results ?? []).find(
    (v) => v.site === 'YouTube' && v.type === 'Trailer'
  );
  return { ...toMovieCard(data), trailerKey: trailer?.key ?? null, overview: data.overview };
}

function toMovieCard(raw) {
  return {
    tmdbMovieId: raw.id,
    title: raw.title,
    posterPath: raw.poster_path ? `${IMG_BASE}${raw.poster_path}` : null,
    releaseDate: raw.release_date,
    rating: raw.vote_average,
  };
}

// Watchlist persistence (movie_watchlist/{listId}) is a Firestore write —
// handled in the Movies feature module, not here, to keep this service
// TMDB-only per the clean-architecture service-layer split.
