import type { WeatherCondition, WeatherSnapshot } from "../types";

interface GeocodingResponse {
  results?: Array<{
    name: string;
    country: string;
    latitude: number;
    longitude: number;
    admin1?: string;
    timezone?: string;
  }>;
}

interface ReverseGeocodingResponse {
  results?: Array<{
    name: string;
    country: string;
    latitude: number;
    longitude: number;
    admin1?: string;
    timezone?: string;
  }>;
}

interface ForecastResponse {
  timezone?: string;
  current?: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    wind_speed_10m: number;
    weather_code: number;
    is_day: number;
    uv_index: number;
    time: string;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    wind_speed_10m: number[];
    uv_index: number[];
    is_day: number[];
  };
}

interface ImdCurrentLike {
  City?: string;
  city?: string;
  Station?: string;
  station?: string;
  State?: string;
  state?: string;
  Temp?: string | number;
  temp?: string | number;
  Temperature?: string | number;
  temperature?: string | number;
  RH?: string | number;
  rh?: string | number;
  humidity?: string | number;
  WS?: string | number;
  ws?: string | number;
  WindSpeed?: string | number;
  windspeed?: string | number;
  Date?: string;
  date?: string;
  Time?: string;
  time?: string;
  WeatherCode?: string | number;
  weathercode?: string | number;
  W_code?: string | number;
}

interface IpLocationResponse {
  city?: string;
  region?: string;
  country_name?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

interface IpWhoResponse {
  success?: boolean;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  timezone?: { id?: string };
}

interface IpInfoResponse {
  city?: string;
  region?: string;
  country?: string;
  loc?: string;
  timezone?: string;
}

interface LocationMatch {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  timezone?: string;
}

const IMD_API_CURRENT = "https://mausam.imd.gov.in/api/current_wx_api.php";
const IMD_API_LOCATIONS = "https://mausam.imd.gov.in/api/cityweather_loc.php";

function desktopFetchJson<T>(url: string): Promise<T> {
  const bridgedFetch = window.coolWeatherDesktop?.fetchJson;
  if (bridgedFetch) {
    return bridgedFetch(url) as Promise<T>;
  }

  return fetch(url).then((response) => {
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    return response.json() as Promise<T>;
  });
}

function normalizeCity(value: string) {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

function isIndianLocation(country: string) {
  return country.trim().toLowerCase() === "india";
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.-]/g, "");
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function toCondition(code: number, isDay: boolean): WeatherCondition {
  if (code === 0) {
    return "clear";
  }

  if (code === 1) {
    return "mostly-sunny";
  }

  if (code === 2) {
    return "partly-cloudy";
  }

  if ([45, 48].includes(code)) {
    return "haze";
  }

  if (code === 3) {
    return "cloudy";
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return "snow";
  }

  if ([95, 96, 99].includes(code)) {
    return "storm";
  }

  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return "rain";
  }

  return isDay ? "clear" : "sunset";
}

function mapImdCodeToCondition(code: number | undefined, fallback: WeatherCondition): WeatherCondition {
  if (code === undefined) {
    return fallback;
  }

  if ([13, 17, 29, 91, 92, 93, 94, 95, 96, 97, 98, 99].includes(code)) {
    return "storm";
  }

  if ([20, 21, 24, 25, 27, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 80, 81, 82, 83, 84].includes(code)) {
    return "rain";
  }

  if ([22, 26, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 85, 86, 87, 88].includes(code)) {
    return "snow";
  }

  if ([1, 2, 3, 4, 5, 10, 11, 12, 18, 28, 40, 41, 42, 43, 44, 46, 47, 49].includes(code)) {
    return "cloudy";
  }

  if ([45, 48].includes(code)) {
    return "haze";
  }

  return fallback;
}

function describeCondition(condition: WeatherCondition): string {
  switch (condition) {
    case "clear":
      return "Clear skies with glowing light and crisp visibility.";
    case "mostly-sunny":
      return "Mostly sunny with occasional soft cloud highlights.";
    case "partly-cloudy":
      return "Partly cloudy with warm light peeking through.";
    case "cloudy":
      return "Cloud layers are drifting across the skyline with soft ambient light.";
    case "haze":
      return "Hazy atmosphere with muted sun and gentle diffusion.";
    case "rain":
      return "Rain bands are moving through with reflective blue highlights.";
    case "storm":
      return "Storm energy is active with heavier atmosphere and electric flashes.";
    case "snow":
      return "Snowfall is softening the air with frosted light and gentle motion.";
    case "sunset":
      return "Warm afterglow is settling in with low light and neon edges.";
    default:
      return "Live weather synced.";
  }
}

function formatUpdatedAt(isoTime: string, timeZone?: string) {
  const date = new Date(isoTime);
  const opts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  };

  if (timeZone) {
    opts.timeZone = timeZone;
  }

  return date.toLocaleTimeString([], opts);
}

function formatHourLabel(isoTime: string, isNow = false) {
  if (isNow) {
    return "Now";
  }

  const date = new Date(isoTime);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

function coerceArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (value && typeof value === "object") {
    const data = value as Record<string, unknown>;
    if (Array.isArray(data.data)) {
      return data.data as T[];
    }
    if (Array.isArray(data.result)) {
      return data.result as T[];
    }
  }

  return [];
}

async function fetchImdSupplement(query: string, fallback: WeatherSnapshot): Promise<Partial<WeatherSnapshot> | null> {
  const normalizedQuery = normalizeCity(query);

  try {
    const [currentRaw, locationsRaw] = await Promise.all([
      desktopFetchJson<unknown>(IMD_API_CURRENT),
      desktopFetchJson<unknown>(IMD_API_LOCATIONS)
    ]);

    const currentRows = coerceArray<ImdCurrentLike>(currentRaw);
    const locationRows = coerceArray<Record<string, unknown>>(locationsRaw);

    if (currentRows.length === 0) {
      return null;
    }

    const locationMatch = locationRows.find((row) => {
      const text = [row.City, row.city, row.Station, row.station, row.Name, row.name]
        .filter(Boolean)
        .map((value) => normalizeCity(String(value)))
        .join(" ");
      return text.includes(normalizedQuery);
    });

    const currentMatch = currentRows.find((row) => {
      const text = [row.City, row.city, row.Station, row.station, row.State, row.state]
        .filter(Boolean)
        .map((value) => normalizeCity(String(value)))
        .join(" ");
      return text.includes(normalizedQuery);
    });

    const match = currentMatch ?? null;
    if (!match) {
      return null;
    }

    const temp = toNumber(match.Temp ?? match.temp ?? match.Temperature ?? match.temperature);
    const humidity = toNumber(match.RH ?? match.rh ?? match.humidity);
    const wind = toNumber(match.WS ?? match.ws ?? match.WindSpeed ?? match.windspeed);
    const rawCode = toNumber(match.WeatherCode ?? match.weathercode ?? match.W_code);
    const condition = mapImdCodeToCondition(rawCode, fallback.condition);

    return {
      city: String(match.City ?? match.city ?? match.Station ?? match.station ?? fallback.city),
      region: String(locationMatch?.State ?? locationMatch?.state ?? match.State ?? match.state ?? fallback.region),
      temperatureC: temp ?? fallback.temperatureC,
      humidity: humidity ?? fallback.humidity,
      windKph: wind ?? fallback.windKph,
      condition: fallback.condition,
      summary: `${describeCondition(condition)} IMD supplement applied for India.`,
      updatedAt: `${String(match.Time ?? match.time ?? fallback.updatedAt)}`.trim() || fallback.updatedAt,
      source: "Open-Meteo + IMD",
      live: true
    };
  } catch {
    return null;
  }
}

async function resolveLocationByQuery(query: string): Promise<LocationMatch> {
  const geocodeUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geocodeUrl.searchParams.set("name", query);
  geocodeUrl.searchParams.set("count", "10");
  geocodeUrl.searchParams.set("language", "en");
  geocodeUrl.searchParams.set("format", "json");

  const geocodeData = await desktopFetchJson<GeocodingResponse>(geocodeUrl.toString());
  const results = geocodeData.results;

  if (!results || results.length === 0) {
    throw new Error("No matching city found.");
  }

  const normalizedQuery = query.trim().toLowerCase();
  const parts = normalizedQuery.split(",").map((part) => part.trim()).filter(Boolean);

  // 1) If input includes comma-separated place + city (e.g., "Patia, Bhubaneswar"), prefer exact match.
  if (parts.length > 1) {
    const placePart = parts[0];
    const cityPart = parts[1];

    const candidate = results.find((r) => {
      const name = String(r.name ?? "").trim().toLowerCase();
      const admin = String(r.admin1 ?? "").trim().toLowerCase();
      const country = String(r.country ?? "").trim().toLowerCase();

      return (
        (name === placePart || name.includes(placePart)) &&
        (admin === cityPart || admin.includes(cityPart) || country === cityPart || country.includes(cityPart))
      );
    });

    if (candidate) {
      return candidate;
    }
  }

  // 2) Prefer exact name match before fallback
  const exactMatch = results.find((r) => String(r.name ?? "").trim().toLowerCase() === normalizedQuery);
  if (exactMatch) {
    return exactMatch;
  }

  // 3) fallback to nearest location, typically first result
  return results[0];
}

async function resolveLocationByCoords(latitude: number, longitude: number): Promise<LocationMatch> {
  const reverseUrl = new URL("https://geocoding-api.open-meteo.com/v1/reverse");
  reverseUrl.searchParams.set("latitude", `${latitude}`);
  reverseUrl.searchParams.set("longitude", `${longitude}`);
  reverseUrl.searchParams.set("language", "en");
  reverseUrl.searchParams.set("format", "json");

  const reverseData = await desktopFetchJson<ReverseGeocodingResponse>(reverseUrl.toString());
  const match = reverseData.results?.[0];

  if (!match) {
    throw new Error("No reverse geocoding match found.");
  }

  return match;
}

function toLocationMatch(candidate: {
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}): LocationMatch | null {
  if (
    !candidate.city ||
    !candidate.country ||
    typeof candidate.latitude !== "number" ||
    typeof candidate.longitude !== "number"
  ) {
    return null;
  }

  return {
    name: candidate.city,
    country: candidate.country,
    admin1: candidate.region,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    timezone: candidate.timezone
  };
}

async function resolveLocationByIp(): Promise<LocationMatch> {
  const providers = [
    async () => {
      const ipLocation = await desktopFetchJson<IpLocationResponse>("https://ipapi.co/json/");
      return toLocationMatch({
        city: ipLocation.city,
        region: ipLocation.region,
        country: ipLocation.country_name ?? ipLocation.country,
        latitude: ipLocation.latitude,
        longitude: ipLocation.longitude,
        timezone: ipLocation.timezone
      });
    },
    async () => {
      const ipWho = await desktopFetchJson<IpWhoResponse>("https://ipwho.is/");
      if (ipWho.success === false) {
        return null;
      }
      return toLocationMatch({
        city: ipWho.city,
        region: ipWho.region,
        country: ipWho.country,
        latitude: ipWho.latitude,
        longitude: ipWho.longitude,
        timezone: ipWho.timezone?.id
      });
    },
    async () => {
      const ipInfo = await desktopFetchJson<IpInfoResponse>("https://ipinfo.io/json");
      const [lat, lon] = (ipInfo.loc ?? "").split(",").map((value) => Number.parseFloat(value));
      return toLocationMatch({
        city: ipInfo.city,
        region: ipInfo.region,
        country: ipInfo.country,
        latitude: lat,
        longitude: lon,
        timezone: ipInfo.timezone
      });
    }
  ];

  for (const provider of providers) {
    try {
      const match = await provider();
      if (match) {
        return match;
      }
    } catch {
      continue;
    }
  }

  throw new Error("No IP-based location found.");
}

function buildHourlySlices(
  hourly: NonNullable<ForecastResponse["hourly"]>,
  currentTime: string
) {
  const currentTimestamp = new Date(currentTime).getTime();
  const startIndex = Math.max(
    0,
    hourly.time.findIndex((time) => new Date(time).getTime() >= currentTimestamp)
  );

  const forecast = Array.from({ length: 4 }, (_, index) => startIndex + index * 2)
    .filter((index) => index < hourly.time.length)
    .map((index, offset) => ({
      label: formatHourLabel(hourly.time[index], offset === 0),
      temperatureC: hourly.temperature_2m[index],
      condition: toCondition(hourly.weather_code[index], hourly.is_day[index] === 1)
    }));

  const hourlyDetails = Array.from({ length: 6 }, (_, index) => startIndex + index)
    .filter((index) => index < hourly.time.length)
    .map((index, offset) => ({
      label: formatHourLabel(hourly.time[index], offset === 0),
      temperatureC: hourly.temperature_2m[index],
      condition: toCondition(hourly.weather_code[index], hourly.is_day[index] === 1),
      windKph: hourly.wind_speed_10m[index],
      uvIndex: hourly.uv_index[index]
    }));

  return { forecast, hourlyDetails };
}

async function buildWeatherSnapshot(match: LocationMatch): Promise<WeatherSnapshot> {
  const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
  forecastUrl.searchParams.set("latitude", `${match.latitude}`);
  forecastUrl.searchParams.set("longitude", `${match.longitude}`);
  forecastUrl.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code,is_day,uv_index"
  );
  forecastUrl.searchParams.set("hourly", "temperature_2m,weather_code,wind_speed_10m,uv_index,is_day");
  forecastUrl.searchParams.set("forecast_days", "1");
  forecastUrl.searchParams.set("timezone", match.timezone ?? "auto");

  const forecastData = await desktopFetchJson<ForecastResponse>(forecastUrl.toString());
  const current = forecastData.current;
  const hourly = forecastData.hourly;

  if (!current || !hourly) {
    throw new Error("Incomplete forecast data.");
  }

  const effectiveTimezone = forecastData.timezone ?? match.timezone;
  const condition = toCondition(current.weather_code, current.is_day === 1);
  const { forecast, hourlyDetails } = buildHourlySlices(hourly, current.time);

  const openMeteoSnapshot: WeatherSnapshot = {
    city: match.name,
    region: match.admin1 ? `${match.admin1}, ${match.country}` : match.country,
    timezone: effectiveTimezone,
    temperatureC: current.temperature_2m,
    feelsLikeC: current.apparent_temperature,
    humidity: current.relative_humidity_2m,
    windKph: current.wind_speed_10m,
    uvIndex: current.uv_index,
    condition,
    summary: describeCondition(condition),
    updatedAt: formatUpdatedAt(current.time, effectiveTimezone),
    source: "Open-Meteo",
    forecast,
    hourlyDetails,
    live: true
  };

  if (!isIndianLocation(match.country)) {
    return openMeteoSnapshot;
  }

  const imdSupplement = await fetchImdSupplement(match.name, openMeteoSnapshot);
  if (!imdSupplement) {
    return openMeteoSnapshot;
  }

  return {
    ...openMeteoSnapshot,
    ...imdSupplement,
    source: imdSupplement.source ?? "Open-Meteo + IMD"
  };
}

export async function fetchLiveWeather(query: string): Promise<WeatherSnapshot> {
  const match = await resolveLocationByQuery(query);
  return buildWeatherSnapshot(match);
}

export async function fetchLiveWeatherByCoords(latitude: number, longitude: number): Promise<WeatherSnapshot> {
  const match = await resolveLocationByCoords(latitude, longitude);
  return buildWeatherSnapshot(match);
}

export async function fetchLiveWeatherByIp(): Promise<WeatherSnapshot> {
  const match = await resolveLocationByIp();
  return buildWeatherSnapshot(match);
}
