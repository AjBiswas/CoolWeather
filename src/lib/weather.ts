import { fallbackWeather, mockWeatherByCity } from "../data/mockWeather";
import type { WeatherSnapshot } from "../types";

export function getWeatherForCity(query: string): WeatherSnapshot {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return fallbackWeather;
  }

  return mockWeatherByCity[normalized] ?? {
    ...fallbackWeather,
    city: query.trim(),
    summary: "Live API not wired yet, so this cinematic preview uses starter demo data.",
    updatedAt: "Preview mode"
  };
}
