import type { WeatherCondition, WeatherSnapshot, LocationSuggestion } from "../types";

interface GeocodingResponse {
  results?: Array<{
    name: string;
    country: string;
    latitude: number;
    longitude: number;
    admin1?: string;
    admin2?: string;
    admin3?: string;
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
    admin2?: string;
    admin3?: string;
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

interface ArchiveResponse {
  timezone?: string;
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    temperature_2m_mean: number[];
    precipitation_sum: number[];
  };
}

interface AstronomyResponse {
  timezone?: string;
  daily?: {
    time: string[];
    sunrise: string[];
    sunset: string[];
    moonrise: string[];
    moonset: string[];
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
  admin2?: string;
  admin3?: string;
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

function toCondition(code: number): WeatherCondition {
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

  return "clear";
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

interface TimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function parseTimeParts(isoTime: string): TimeParts | null {
  const trimmed = isoTime.trim();

  // Local string with no timezone offset (e.g., "2026-03-30T01:00" or "2026-03-30 01:00").
  const localMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (localMatch) {
    return {
      year: Number(localMatch[1]),
      month: Number(localMatch[2]),
      day: Number(localMatch[3]),
      hour: Number(localMatch[4]),
      minute: Number(localMatch[5]),
      second: Number(localMatch[6] ?? "0")
    };
  }

  // ISO with timezone/UTC offset (e.g., "2026-03-30T01:00Z", "2026-03-30T01:00+05:30").
  const offsetMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(Z|[+\-]\d{2}:?\d{2})$/);
  if (offsetMatch) {
    return {
      year: Number(offsetMatch[1]),
      month: Number(offsetMatch[2]),
      day: Number(offsetMatch[3]),
      hour: Number(offsetMatch[4]),
      minute: Number(offsetMatch[5]),
      second: Number(offsetMatch[6] ?? "0")
    };
  }

  // Fallback: parse as Date and use UTC components.
  const date = new Date(trimmed);
  if (!Number.isNaN(date.getTime())) {
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      second: date.getUTCSeconds()
    };
  }

  return null;
}

function timePartsToTimestamp(parts: TimeParts): number {
  // Use UTC to compute a comparable value independent of local host timezone.
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

function toComparableTimestamp(isoTime: string): number {
  const tzMatch = /(?:Z|[+\-]\d{2}:?\d{2})$/.test(isoTime.trim());
  if (tzMatch) {
    const date = new Date(isoTime);
    if (!Number.isNaN(date.getTime())) {
      return date.getTime();
    }
  }

  const parts = parseTimeParts(isoTime);
  if (!parts) {
    return NaN;
  }

  return timePartsToTimestamp(parts);
}

function formatHourLabel(isoTime: string | Date, isNow = false) {
  if (isNow) {
    return "Now";
  }

  let parts: TimeParts | null = null;

  if (isoTime instanceof Date) {
    parts = {
      year: isoTime.getFullYear(),
      month: isoTime.getMonth() + 1,
      day: isoTime.getDate(),
      hour: isoTime.getHours(),
      minute: isoTime.getMinutes(),
      second: isoTime.getSeconds()
    };
  } else {
    parts = parseTimeParts(isoTime);
  }

  if (!parts) {
    return "--";
  }

  let hour = parts.hour;
  const minute = parts.minute;
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) {
    hour = 12;
  }

  const minuteStr = `${minute}`.padStart(2, "0");
  return `${hour}:${minuteStr} ${ampm}`;
}

function formatUpdatedAt(isoTime: string, timeZone?: string) {
  const parts = parseTimeParts(isoTime);

  if (!parts) {
    return "--";
  }

  let date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second));

  if (timeZone) {
    const options: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone
    };
    return date.toLocaleTimeString([], options);
  }

  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

const RAD = Math.PI / 180;
const DAY_MS = 1000 * 60 * 60 * 24;

function toJulian(date: Date) {
  return date.getTime() / DAY_MS - 0.5 + 2440588;
}

function fromJulian(julian: number) {
  return new Date((julian - 2440588 + 0.5) * DAY_MS);
}

function daysSince2000(date: Date) {
  return (date.getTime() - Date.UTC(2000, 0, 1, 12, 0, 0)) / DAY_MS;
}

function normalizeAngle(angle: number) {
  return angle - Math.floor(angle / (2 * Math.PI)) * 2 * Math.PI;
}

function moonCoords(d: number) {
  const L = normalizeAngle((218.316 + 13.176396 * d) * RAD);
  const M = normalizeAngle((134.963 + 13.064993 * d) * RAD);
  const F = normalizeAngle((93.272 + 13.229350 * d) * RAD);

  const l = L + (6.289 * RAD) * Math.sin(M);
  const b = (5.128 * RAD) * Math.sin(F);
  const dist = 385001 - 20905 * Math.cos(M);

  return { l, b, dist };
}

function eclipticToEquatorial(l: number, b: number) {
  const e = (23.439291 - 0.0130042 * (daysSince2000(new Date()) / 36525)) * RAD;

  const sinE = Math.sin(e);
  const cosE = Math.cos(e);

  const sinL = Math.sin(l);
  const cosL = Math.cos(l);
  const sinB = Math.sin(b);
  const cosB = Math.cos(b);

  const x = cosL * cosB;
  const y = sinL * cosB;
  const z = sinB;

  const xEq = x;
  const yEq = y * cosE - z * sinE;
  const zEq = y * sinE + z * cosE;

  const ra = Math.atan2(yEq, xEq);
  const dec = Math.atan2(zEq, Math.sqrt(xEq * xEq + yEq * yEq));

  return { ra, dec };
}

function siderealTime(d: number, lw: number) {
  return normalizeAngle((280.16 + 360.9856235 * d) * RAD) - lw;
}

function moonPosition(date: Date, lat: number, lng: number) {
  const d = daysSince2000(date);
  const coords = moonCoords(d);
  const eq = eclipticToEquatorial(coords.l, coords.b);

  const lw = -lng * RAD;
  const phi = lat * RAD;
  const H = siderealTime(d, lw) - eq.ra;

  const altitude = Math.asin(
    Math.sin(phi) * Math.sin(eq.dec) +
      Math.cos(phi) * Math.cos(eq.dec) * Math.cos(H)
  );

  return { altitude, azimuth: Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(eq.dec) * Math.cos(phi)), distance: coords.dist };
}

function getMoonTimes(date: Date, lat: number, lng: number) {
  const hc = 0.133 * RAD;
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));

  let rise: Date | undefined;
  let set: Date | undefined;
  let prev = moonPosition(start, lat, lng);
  let prevAlt = prev.altitude - hc;

  for (let hour = 1; hour <= 24; hour++) {
    const instant = new Date(start.getTime() + hour * 3600000);
    const current = moonPosition(instant, lat, lng);
    const currentAlt = current.altitude - hc;

    if (prevAlt <= 0 && currentAlt > 0) {
      const t = hour - 1 + (0 - prevAlt) / (currentAlt - prevAlt);
      rise = new Date(start.getTime() + t * 3600000);
    }

    if (prevAlt >= 0 && currentAlt < 0) {
      const t = hour - 1 + (0 - prevAlt) / (currentAlt - prevAlt);
      set = new Date(start.getTime() + t * 3600000);
    }

    prevAlt = currentAlt;
  }

  return { rise, set };
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
  const currentTimestamp = toComparableTimestamp(currentTime);
  const startIndex = Math.max(
    0,
    hourly.time.findIndex((time) => toComparableTimestamp(time) >= currentTimestamp)
  );

  const forecast = Array.from({ length: 4 }, (_, index) => startIndex + index * 2)
    .filter((index) => index < hourly.time.length)
    .map((index, offset) => ({
      label: formatHourLabel(hourly.time[index], offset === 0),
      temperatureC: hourly.temperature_2m[index],
      condition: toCondition(hourly.weather_code[index])
    }));

  const hourlyDetails = Array.from({ length: 6 }, (_, index) => startIndex + index)
    .filter((index) => index < hourly.time.length)
    .map((index, offset) => ({
      label: formatHourLabel(hourly.time[index], offset === 0),
      temperatureC: hourly.temperature_2m[index],
      condition: toCondition(hourly.weather_code[index]),
      windKph: hourly.wind_speed_10m[index],
      uvIndex: hourly.uv_index[index]
    }));

  return { forecast, hourlyDetails };
}

async function fetchHistoricalData(latitude: number, longitude: number, timezone?: string) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const startDate = new Date(yesterday);
  startDate.setDate(startDate.getDate() - 9);
  
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  
  const archiveUrl = new URL("https://archive-api.open-meteo.com/v1/archive");
  archiveUrl.searchParams.set("latitude", `${latitude}`);
  archiveUrl.searchParams.set("longitude", `${longitude}`);
  archiveUrl.searchParams.set("start_date", formatDate(startDate));
  archiveUrl.searchParams.set("end_date", formatDate(yesterday));
  archiveUrl.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum");
  archiveUrl.searchParams.set("timezone", timezone ?? "auto");

  try {
    const archiveData = await desktopFetchJson<ArchiveResponse>(archiveUrl.toString());
    const daily = archiveData.daily;

    if (!daily || !daily.time) {
      return undefined;
    }

    return daily.time.map((date, index) => ({
      date,
      temperatureMaxC: daily.temperature_2m_max[index] ?? 0,
      temperatureMinC: daily.temperature_2m_min[index] ?? 0,
      temperatureAvgC: daily.temperature_2m_mean[index] ?? 0,
      condition: toCondition(daily.weather_code[index] ?? 0),
      precipitationMm: daily.precipitation_sum[index] ?? 0
    }));
  } catch {
    return undefined;
  }
}

async function fetchAstronomyData(latitude: number, longitude: number, timezone?: string) {
  const formatTime = (time: string | undefined, tz?: string) => {
    if (!time) return undefined;
    const date = new Date(time);
    if (Number.isNaN(date.getTime())) {
      return undefined;
    }

    const options: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    };

    if (tz && tz !== "auto") {
      options.timeZone = tz;
    }

    return date.toLocaleTimeString("en-US", options);
  };

  // Try sunrise/sunset first (supported on this backend/API version).
  const safeAstronomyUrl = new URL("https://api.open-meteo.com/v1/forecast");
  safeAstronomyUrl.searchParams.set("latitude", `${latitude}`);
  safeAstronomyUrl.searchParams.set("longitude", `${longitude}`);
  safeAstronomyUrl.searchParams.set("daily", "sunrise,sunset");
  safeAstronomyUrl.searchParams.set("forecast_days", "1");
  safeAstronomyUrl.searchParams.set("timezone", timezone ?? "auto");

  let sunrise: string | undefined;
  let sunset: string | undefined;
  let sunriseIso: string | undefined;
  let sunsetIso: string | undefined;

  try {
    const response = await desktopFetchJson<AstronomyResponse>(safeAstronomyUrl.toString());
    const daily = response.daily;

    if (daily && daily.time && daily.time.length > 0) {
      sunriseIso = daily.sunrise?.[0];
      sunsetIso = daily.sunset?.[0];
      sunrise = formatTime(sunriseIso, timezone);
      sunset = formatTime(sunsetIso, timezone);
    }
  } catch (error) {
    console.warn("Astronomy sunrise/sunset fetch failed:", error);
  }

  // Moonrise/moonset are not consistently available in this version of Open-Meteo API.
  // Try to request them separately in case they become available.
  let moonrise: string | undefined;
  let moonset: string | undefined;

  let moonriseIso: string | undefined;
  let moonsetIso: string | undefined;

  try {
    const moonUrl = new URL("https://api.open-meteo.com/v1/forecast");
    moonUrl.searchParams.set("latitude", `${latitude}`);
    moonUrl.searchParams.set("longitude", `${longitude}`);
    moonUrl.searchParams.set("daily", "moonrise,moonset");
    moonUrl.searchParams.set("forecast_days", "1");
    moonUrl.searchParams.set("timezone", timezone ?? "auto");

    const response = await desktopFetchJson<AstronomyResponse>(moonUrl.toString());
    const daily = response.daily;

    if (daily && daily.time && daily.time.length > 0) {
      moonriseIso = daily.moonrise?.[0];
      moonsetIso = daily.moonset?.[0];
      moonrise = formatTime(moonriseIso, timezone);
      moonset = formatTime(moonsetIso, timezone);
    }
  } catch {
    // Ignore, keep as undefined.
  }

  // If moonrise/moonset are still missing, try local estimate.
  if (!moonrise || !moonset) {
    const estimate = getMoonTimes(new Date(), latitude, longitude);
    if (!moonrise && estimate.rise) {
      moonrise = formatTime(estimate.rise.toISOString(), timezone);
    }
    if (!moonset && estimate.set) {
      moonset = formatTime(estimate.set.toISOString(), timezone);
    }
  }

  return {
    sunrise,
    sunset,
    moonrise,
    moonset,
    sunriseIso,
    sunsetIso,
    moonriseIso,
    moonsetIso
  };
}

function isDaylight(currentIso: string, sunriseIso?: string, sunsetIso?: string): boolean {
  const now = new Date(currentIso);
  if (Number.isNaN(now.getTime())) {
    return true; // fallback to daytime
  }

  if (sunriseIso && sunsetIso) {
    const sunriseDate = new Date(sunriseIso);
    const sunsetDate = new Date(sunsetIso);

    if (!Number.isNaN(sunriseDate.getTime()) && !Number.isNaN(sunsetDate.getTime())) {
      return now >= sunriseDate && now < sunsetDate;
    }
  }

  return true;
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
  const astronomyData = await fetchAstronomyData(match.latitude, match.longitude, match.timezone);

  const isNight = !isDaylight(current.time, astronomyData.sunriseIso, astronomyData.sunsetIso);
  const condition = toCondition(current.weather_code);
  const { forecast, hourlyDetails } = buildHourlySlices(hourly, current.time);

  // Fetch historical data (last 10 days)
  const historicalData = await fetchHistoricalData(match.latitude, match.longitude, match.timezone);

  // Build specific location string if admin2 or admin3 available
  let specificLocation: string | undefined;
  if (match.admin2) {
    specificLocation = match.admin3 ? `${match.admin3}, ${match.admin2}` : match.admin2;
  }

  const openMeteoSnapshot: WeatherSnapshot = {
    city: match.name,
    region: match.admin1 ? `${match.admin1}, ${match.country}` : match.country,
    specificLocation,
    latitude: match.latitude,
    longitude: match.longitude,
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
    isNight,
    sunrise: astronomyData.sunrise,
    sunset: astronomyData.sunset,
    moonrise: astronomyData.moonrise,
    moonset: astronomyData.moonset,
    forecast,
    hourlyDetails,
    historicalData,
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

export async function fetchOpenMeteoService(
  service: string,
  latitude: number,
  longitude: number,
  timezone?: string
): Promise<unknown> {
  const base = (url: string) => desktopFetchJson<unknown>(url);

  switch (service) {
    case "weather-forecast": {
      const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
      forecastUrl.searchParams.set("latitude", `${latitude}`);
      forecastUrl.searchParams.set("longitude", `${longitude}`);
      forecastUrl.searchParams.set("current", "temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code,is_day,uv_index");
      forecastUrl.searchParams.set("hourly", "temperature_2m,weather_code,wind_speed_10m,uv_index,is_day");
      forecastUrl.searchParams.set("forecast_days", "1");
      forecastUrl.searchParams.set("timezone", timezone ?? "auto");
      return base(forecastUrl.toString());
    }
    case "historical-weather": {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const startDate = new Date(yesterday);
      startDate.setDate(startDate.getDate() - 9);
      const formatDate = (d: Date) => d.toISOString().split("T")[0];

      const archiveUrl = new URL("https://archive-api.open-meteo.com/v1/archive");
      archiveUrl.searchParams.set("latitude", `${latitude}`);
      archiveUrl.searchParams.set("longitude", `${longitude}`);
      archiveUrl.searchParams.set("start_date", formatDate(startDate));
      archiveUrl.searchParams.set("end_date", formatDate(yesterday));
      archiveUrl.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum");
      archiveUrl.searchParams.set("timezone", timezone ?? "auto");
      return base(archiveUrl.toString());
    }
    case "ensemble-models": {
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", `${latitude}`);
      url.searchParams.set("longitude", `${longitude}`);
      url.searchParams.set("models", "ecmwf,meteo-fr,ukmo");
      url.searchParams.set("hourly", "temperature_2m,weather_code");
      url.searchParams.set("forecast_days", "2");
      url.searchParams.set("timezone", timezone ?? "auto");
      return base(url.toString());
    }
    case "seasonal-forecast": {
      const url = new URL("https://seasonal-api.open-meteo.com/v1/seasonal");
      url.searchParams.set("latitude", `${latitude}`);
      url.searchParams.set("longitude", `${longitude}`);
      url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_sum");
      url.searchParams.set("timezone", timezone ?? "auto");
      return base(url.toString());
    }
    case "climate-change": {
      const url = new URL("https://climate-api.open-meteo.com/v1/climate");
      url.searchParams.set("latitude", `${latitude}`);
      url.searchParams.set("longitude", `${longitude}`);
      url.searchParams.set("start_year", "1991");
      url.searchParams.set("end_year", "2100");
      url.searchParams.set("temperature_unit", "celsius");
      url.searchParams.set("models", "CMCC_CM2_VHR4");
      url.searchParams.set("daily", "temperature_2m_max");
      return base(url.toString());
    }
    case "marine-forecast": {
      const url = new URL("https://marine-api.open-meteo.com/v1/marine");
      url.searchParams.set("latitude", `${latitude}`);
      url.searchParams.set("longitude", `${longitude}`);
      url.searchParams.set("hourly", "wave_height,swell_wave_height,swell_wave_period,swell_wave_direction");
      url.searchParams.set("timezone", timezone ?? "auto");
      return base(url.toString());
    }
    case "air-quality": {
      const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
      url.searchParams.set("latitude", `${latitude}`);
      url.searchParams.set("longitude", `${longitude}`);
      url.searchParams.set("current", "pm2_5,pm10,us_aqi");
      url.searchParams.set("timezone", timezone ?? "auto");
      return base(url.toString());
    }
    case "satellite-radiation": {
      const url = new URL("https://radiation-api.open-meteo.com/v1/radiation");
      url.searchParams.set("latitude", `${latitude}`);
      url.searchParams.set("longitude", `${longitude}`);
      url.searchParams.set("hourly", "global_radiation");
      url.searchParams.set("timezone", timezone ?? "auto");
      return base(url.toString());
    }
    case "geocoding": {
      const geocodeUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
      geocodeUrl.searchParams.set("name", `${latitude},${longitude}`);
      geocodeUrl.searchParams.set("count", "5");
      geocodeUrl.searchParams.set("language", "en");
      geocodeUrl.searchParams.set("format", "json");
      return base(geocodeUrl.toString());
    }
    case "elevation": {
      const url = new URL("https://api.open-meteo.com/v1/elevation");
      url.searchParams.set("latitude", `${latitude}`);
      url.searchParams.set("longitude", `${longitude}`);
      return base(url.toString());
    }
    case "flood": {
      const url = new URL("https://flood-api.open-meteo.com/v1/flood");
      url.searchParams.set("latitude", `${latitude}`);
      url.searchParams.set("longitude", `${longitude}`);
      url.searchParams.set("daily", "river_discharge");
      url.searchParams.set("timezone", timezone ?? "auto");
      return base(url.toString());
    }
    default:
      throw new Error(`Unsupported Open-Meteo service: ${service}`);
  }
}

export async function fetchLiveWeather(query: string): Promise<WeatherSnapshot> {
  const match = await resolveLocationByQuery(query);
  return buildWeatherSnapshot(match);
}

export async function fetchLiveWeatherByCoords(latitude: number, longitude: number): Promise<WeatherSnapshot> {
  const match = await resolveLocationByCoords(latitude, longitude);
  return buildWeatherSnapshot(match);
}

export async function fetchLocationSuggestions(query: string): Promise<LocationSuggestion[]> {
  if (query.trim().length < 2) {
    return [];
  }

  const geocodeUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geocodeUrl.searchParams.set("name", query.trim());
  geocodeUrl.searchParams.set("count", "10");
  geocodeUrl.searchParams.set("language", "en");
  geocodeUrl.searchParams.set("format", "json");

  const geocodeData = await desktopFetchJson<GeocodingResponse>(geocodeUrl.toString());
  const results = geocodeData.results || [];

  return results
    .slice(0, 5)
    .map((r): LocationSuggestion => ({
      name: r.name,
      country: r.country,
      region: r.admin1,
      admin1: r.admin1,
      latitude: r.latitude,
      longitude: r.longitude
    }));
}

export async function fetchLiveWeatherByIp(): Promise<WeatherSnapshot> {
  const match = await resolveLocationByIp();
  return buildWeatherSnapshot(match);
}
