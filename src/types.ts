export type WeatherCondition =
  | "clear"
  | "mostly-sunny"
  | "partly-cloudy"
  | "cloudy"
  | "haze"
  | "rain"
  | "storm"
  | "snow"
  | "sunset";

export interface ForecastPoint {
  label: string;
  temperatureC: number;
  condition: WeatherCondition;
}

export interface HourlyDetailPoint {
  label: string;
  temperatureC: number;
  condition: WeatherCondition;
  windKph: number;
  uvIndex: number;
}

export interface WeatherSnapshot {
  city: string;
  region: string;
  temperatureC: number;
  feelsLikeC: number;
  humidity: number;
  windKph: number;
  uvIndex: number;
  condition: WeatherCondition;
  summary: string;
  updatedAt: string;
  source?: string;
  live?: boolean;
  timezone?: string;
  forecast: ForecastPoint[];
  hourlyDetails: HourlyDetailPoint[];
}
