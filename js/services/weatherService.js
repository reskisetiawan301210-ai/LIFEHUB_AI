/**
 * services/weatherService.js — OpenWeatherMap API connection management.
 */

import { requestJSON } from './_httpClient.js';

const API_BASE = 'https://api.openweathermap.org/data/2.5';
const API_KEY = import.meta.env?.VITE_WEATHER_API_KEY ?? '';

const FALLBACK_LOCATION = { lat: 40.7128, lon: -74.006, label: 'New York, US' };

/**
 * @param {{lat: number, lon: number}} coords
 * @returns {Promise<{tempC: number, condition: string, icon: string, locationLabel: string}>}
 */
export async function getCurrentWeather(coords = FALLBACK_LOCATION) {
  const url = `${API_BASE}/weather?lat=${coords.lat}&lon=${coords.lon}&units=metric&appid=${API_KEY}`;
  try {
    const data = await requestJSON(url);
    return {
      tempC: data.main?.temp,
      condition: data.weather?.[0]?.main ?? 'Unknown',
      icon: data.weather?.[0]?.icon ?? '01d',
      locationLabel: data.name || coords.label || 'Your area',
    };
  } catch (err) {
    // Fallback per brief: default regional settings + placeholder template.
    return { tempC: null, condition: 'Unavailable', icon: '01d', locationLabel: coords.label ?? 'Unknown' };
  }
}

export async function getForecast(coords = FALLBACK_LOCATION) {
  const url = `${API_BASE}/forecast?lat=${coords.lat}&lon=${coords.lon}&units=metric&appid=${API_KEY}`;
  try {
    const data = await requestJSON(url);
    return (data.list ?? []).slice(0, 8).map((entry) => ({
      time: entry.dt_txt,
      tempC: entry.main?.temp,
      condition: entry.weather?.[0]?.main,
    }));
  } catch (err) {
    return [];
  }
}
