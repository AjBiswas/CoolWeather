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

export interface WeatherSnapshot {
  city: string;
  region: string;
  specificLocation?: string;
  latitude?: number;
  longitude?: number;
  temperatureC: number;
  feelsLikeC: number;
  humidity: number;
  windKph: number;
  uvIndex: number;
  aqi?: number;
  aqiStatus?: string;
  condition: WeatherCondition;
  summary: string;
  updatedAt: string;
  source?: string;
  live?: boolean;
  timezone?: string;
  sunrise?: string;
  sunset?: string;
  moonrise?: string;
  moonset?: string;
  isNight?: boolean;
  forecast: ForecastPoint[];
  hourlyDetails: HourlyDetailPoint[];
  historicalData?: HistoricalDataPoint[];
}

export interface ForecastPoint {
  label: string;
  temperatureC: number;
  condition: WeatherCondition;
}

export interface HourlyDetailPoint {
  label: string;
  temperatureC: number;
  condition: WeatherCondition;
  isNight: boolean;
  windKph: number;
  uvIndex: number;
}

export interface HistoricalDataPoint {
  date: string;
  temperatureMaxC: number;
  temperatureMinC: number;
  temperatureAvgC: number;
  condition: WeatherCondition;
  precipitationMm: number;
}

export interface LocationSuggestion {
  name: string;
  country: string;
  region?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}
