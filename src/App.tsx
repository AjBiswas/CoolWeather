import React, { useEffect, useMemo, useRef, useState, useCallback, type CSSProperties, type FormEvent } from "react";
import { WeatherScene } from "./components/WeatherScene";
import { fallbackWeather } from "./data/mockWeather";
import {
  fetchLiveWeather,
  fetchLiveWeatherByCoords,
  fetchLiveWeatherByIp,
  fetchLocationSuggestions,
  fetchOpenMeteoService
} from "./lib/liveWeather";
import type { WeatherSnapshot, LocationSuggestion } from "./types";


const BASE_WIDGET_WIDTH = 320;
const BASE_WIDGET_HEIGHT = 250;
const zeroWeather: WeatherSnapshot = {
  ...fallbackWeather,
  city: "Location unavailable",
  region: "",
  temperatureC: 0,
  feelsLikeC: 0,
  humidity: 0,
  windKph: 0,
  uvIndex: 0,
  condition: "clear",
  summary: "Location unavailable.",
  updatedAt: "--",
  source: "Fallback",
  live: false,
  forecast: fallbackWeather.forecast.map((entry) => ({
    ...entry,
    temperatureC: 0
  })),
  hourlyDetails: fallbackWeather.hourlyDetails.map((entry) => ({
    ...entry,
    temperatureC: 0,
    windKph: 0,
    uvIndex: 0
  }))
};

function displayTemp(value: number, showPlaceholder = false) {
  if (showPlaceholder) {
    return "--";
  }

  return Math.round(value).toString();
}

function formatTemp(value: number, showPlaceholder = false) {
  return showPlaceholder ? "--" : `${Math.round(value)}°`;
}

function toFahrenheit(value: number) {
  return Math.round((value * 9) / 5 + 32);
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function displayConditionName(value: WeatherSnapshot["condition"], isNight: boolean = false) {
  const daySuffix = isNight ? " Night" : "";

  switch (value) {
    case "clear":
      return isNight ? "Clear Night" : "Clear Sky";
    case "cloudy":
      return `Cloudy${daySuffix}`;
    case "rain":
      return `Rainy${daySuffix}`;
    case "storm":
      return isNight ? "Stormy Night" : "Storm";
    case "snow":
      return isNight ? "Snowy Night" : "Snow";
    case "mostly-sunny":
      return isNight ? "Mostly Clear Night" : "Mostly Sunny";
    case "partly-cloudy":
      return `Partly Cloudy${daySuffix}`;
    case "haze":
      return isNight ? "Hazy Night" : "Haze";
    case "sunset":
      return "Sunset Glow";
    default: {
      const baseName = titleCase(value);
      return (isNight ? baseName.replace(/sunny/ig, "Clear") : baseName) + daySuffix;
    }
  }
}

function getUvLabel(value: number) {
  if (value >= 8) {
    return "Very high";
  }
  if (value >= 6) {
    return "High";
  }
  if (value >= 3) {
    return "Moderate";
  }
  return "Low";
}

function renderOpenMeteoData(data: unknown): JSX.Element {
  if (data === null || data === undefined) {
    return <p>No data available.</p>;
  }

  if (Array.isArray(data)) {
    return (
      <div>
        <p>Items: {data.length}</p>
        <ul>
          {data.slice(0, 5).map((item, idx) => (
            <li key={idx}>{typeof item === "object" ? JSON.stringify(item) : String(item)}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const firstKeys = Object.keys(obj).slice(0, 20);
    return (
      <div className="open-meteo-service-data">
        {firstKeys.map((key) => {
          const value = obj[key];
          if (value === null || value === undefined) {
            return null;
          }

          if (typeof value === "object") {
            if (Array.isArray(value)) {
              return (
                <div key={key} className="open-meteo-service-row">
                  <strong>{key}</strong>: array ({value.length})
                </div>
              );
            }

            return (
              <div key={key} className="open-meteo-service-row">
                <strong>{key}</strong>: {JSON.stringify(value)}
              </div>
            );
          }

          return (
            <div key={key} className="open-meteo-service-row">
              <strong>{key}</strong>: {String(value)}
            </div>
          );
        })}
        {Object.keys(obj).length > firstKeys.length ? (
          <em>... {Object.keys(obj).length - firstKeys.length} more keys</em>
        ) : null}
      </div>
    );
  }

  return <p>{String(data)}</p>;
}

function getAirQualityLabel(key: string, value: number) {
  if (key === "us_aqi") {
    if (value <= 50) return "Good";
    if (value <= 100) return "Moderate";
    if (value <= 150) return "Poor";
    if (value <= 200) return "Unhealthy";
    if (value <= 300) return "Very Poor";
    return "Dangerous";
  }
  if (key === "pm2_5") {
    if (value <= 12.0) return "Good";
    if (value <= 35.4) return "Moderate";
    if (value <= 55.4) return "Poor";
    if (value <= 150.4) return "Very Poor";
    return "Dangerous";
  }
  if (key === "pm10") {
    if (value <= 54) return "Good";
    if (value <= 154) return "Moderate";
    if (value <= 254) return "Poor";
    if (value <= 354) return "Very Poor";
    return "Dangerous";
  }
  return "";
}

function renderAirQualityData(data: unknown, cityName: string): JSX.Element {
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (obj.current && typeof obj.current === "object") {
      const current = obj.current as Record<string, unknown>;
      const units = (obj.current_units as Record<string, unknown>) || {};
      return (
        <div className="open-meteo-service-data">
          <div className="open-meteo-service-row" style={{ marginBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.2)", paddingBottom: "12px" }}>
            <strong>Real-time (Current) Air Quality for {cityName}</strong>
          </div>
          {Object.keys(current).map((key) => {
            if (key === "time" || key === "interval" || key === "european_aqi") return null;
            const label = key === "us_aqi" ? "AQI" :
                          key === "pm10" ? "PM10" :
                          key === "pm2_5" ? "PM2.5" :
                          key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

            const numValue = Number(current[key]);
            const qualityDesc = !isNaN(numValue) ? getAirQualityLabel(key, numValue) : "";
            const displayDesc = qualityDesc ? ` (${qualityDesc})` : "";

            return (
              <div key={key} className="open-meteo-service-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', marginBottom: '8px', gap: '16px' }}>
                <strong style={{ color: "rgba(255,255,255,0.9)", wordBreak: 'break-word', flexShrink: 1, minWidth: 0 }}>{label}</strong>
                <span style={{ textAlign: 'right', flexShrink: 0 }}>
                  <strong style={{ color: "white", display: 'block' }}>{String(current[key])} {units[key] && units[key] !== "USAQI" ? String(units[key]) : ""}</strong>
                  <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9em" }}>{displayDesc}</span>
                </span>
              </div>
            );
          })}
        </div>
      );
    }
  }
  return renderOpenMeteoData(data);
}

function renderSeasonalData(data: unknown, cityName: string): JSX.Element {
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (obj.daily && typeof obj.daily === "object") {
      const daily = obj.daily as Record<string, unknown[]>;
      const times = daily.time as string[];
      const tempMax = daily.temperature_2m_max as number[];
      const tempMin = daily.temperature_2m_min as number[];
      const precip = daily.precipitation_sum as number[];

      if (Array.isArray(times)) {
        // Group 180 days of forecasts into clean monthly averages
        const monthlyData: Record<string, { max: number[], min: number[], precip: number[] }> = {};
        times.forEach((time, index) => {
          if (typeof time !== "string") return;
          const month = time.substring(0, 7); // YYYY-MM
          if (!monthlyData[month]) {
            monthlyData[month] = { max: [], min: [], precip: [] };
          }
          if (tempMax && typeof tempMax[index] === "number") monthlyData[month].max.push(tempMax[index]);
          if (tempMin && typeof tempMin[index] === "number") monthlyData[month].min.push(tempMin[index]);
          if (precip && typeof precip[index] === "number") monthlyData[month].precip.push(precip[index]);
        });

        const months = Object.keys(monthlyData).slice(0, 6); // Display the next 6 months

        return (
          <div className="open-meteo-service-data">
            <div className="open-meteo-service-row" style={{ marginBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.2)", paddingBottom: "12px" }}>
              <strong>Seasonal Forecast (Monthly Averages) for {cityName}</strong>
            </div>
            {months.map(month => {
              const monthData = monthlyData[month];
              const avgMax = monthData.max.length > 0 ? Math.round(monthData.max.reduce((a, b) => a + b, 0) / monthData.max.length) : "--";
              const avgMin = monthData.min.length > 0 ? Math.round(monthData.min.reduce((a, b) => a + b, 0) / monthData.min.length) : "--";
              const totalPrecip = monthData.precip.length > 0 ? Math.round(monthData.precip.reduce((a, b) => a + b, 0)) : "--";
              
              const [yearStr, monthStr] = month.split("-");
              const dateObj = new Date(Number(yearStr), Number(monthStr) - 1, 1);
              const monthName = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

              return (
                <div key={month} className="open-meteo-service-row" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', padding: '12px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', marginBottom: '8px', rowGap: '12px', columnGap: '24px' }}>
                  <div style={{ flex: '1 1 120px', color: 'white', fontWeight: 'bold' }}>
                    <span>{monthName}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', flex: '1 1 180px', minWidth: '180px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75em", textTransform: 'uppercase', letterSpacing: '0.5px' }}>High</span>
                      <strong style={{ color: "white", fontSize: "1em" }}>{avgMax}°</strong>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75em", textTransform: 'uppercase', letterSpacing: '0.5px' }}>Low</span>
                      <strong style={{ color: "white", fontSize: "1em" }}>{avgMin}°</strong>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75em", textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rain</span>
                      <strong style={{ color: "white", fontSize: "1em" }}>{totalPrecip}mm</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      }
    }
  }
  return renderOpenMeteoData(data);
}

function renderElevationData(data: unknown, cityName: string): JSX.Element {
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.elevation) && obj.elevation.length > 0) {
      return (
        <div className="open-meteo-service-data">
          <div className="open-meteo-service-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 12px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', marginBottom: '8px' }}>
            <div style={{ color: 'white', fontWeight: 'bold' }}>
              Elevation for {cityName}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75em", textTransform: 'uppercase', letterSpacing: '0.5px' }}>Altitude</span>
              <strong style={{ color: "white", fontSize: "1em" }}>{obj.elevation[0]} meters</strong>
            </div>
          </div>
        </div>
      );
    }
  }
  return renderOpenMeteoData(data);
}

function renderGeocodingData(data: unknown, cityName: string): JSX.Element {
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.results) && obj.results.length > 0) {
      return (
        <div className="open-meteo-service-data">
           <div className="open-meteo-service-row" style={{ marginBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.2)", paddingBottom: "12px" }}>
            <strong>Geocoding Info near {cityName}</strong>
          </div>
          {obj.results.slice(0, 4).map((res: any, i) => (
            <div key={i} className="open-meteo-service-row" style={{ padding: '12px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', marginBottom: '8px' }}>
              <div style={{ marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: 'bold' }}>
                <span style={{ wordBreak: 'break-word' }}>{res.name} {res.country ? `(${res.country})` : ""}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', rowGap: '8px', columnGap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75em", textTransform: 'uppercase', letterSpacing: '0.5px' }}>Latitude</span>
                  <strong style={{ color: "white", fontSize: "1em", wordBreak: 'break-word' }}>{res.latitude?.toFixed(4)}</strong>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75em", textTransform: 'uppercase', letterSpacing: '0.5px' }}>Longitude</span>
                  <strong style={{ color: "white", fontSize: "1em", wordBreak: 'break-word' }}>{res.longitude?.toFixed(4)}</strong>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 2' }}>
                  <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75em", textTransform: 'uppercase', letterSpacing: '0.5px' }}>Timezone</span>
                  <strong style={{ color: "white", fontSize: "1em", wordBreak: 'break-word' }}>{res.timezone}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }
  }
  return renderOpenMeteoData(data);
}

function renderTimeSeriesData(data: unknown, cityName: string, title: string, timezone?: string): JSX.Element {
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const seriesData = (obj.hourly || obj.daily || obj.models_yearly) as Record<string, unknown[]> | undefined;
    const units = (obj.hourly_units || obj.daily_units || obj.models_yearly_units || {}) as Record<string, string>;

    if (seriesData && Array.isArray(seriesData.time)) {
      const times = seriesData.time as string[];
      const isHourly = !!obj.hourly;
      let startIndex = 0;

      let yyyy, mm, dd, hh;
      try {
        const d = new Date();
        const tz = timezone || "UTC";
        const local = new Date(d.toLocaleString("en-US", { timeZone: tz }));
        yyyy = local.getFullYear();
        mm = String(local.getMonth() + 1).padStart(2, '0');
        dd = String(local.getDate()).padStart(2, '0');
        hh = String(local.getHours()).padStart(2, '0');
      } catch (e) {
        const d = new Date();
        yyyy = d.getUTCFullYear();
        mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        dd = String(d.getUTCDate()).padStart(2, '0');
        hh = String(d.getUTCHours()).padStart(2, '0');
      }

      if (isHourly) {
        const currentHourPrefix = `${yyyy}-${mm}-${dd}T${hh}`;
        startIndex = times.findIndex(t => String(t).startsWith(currentHourPrefix));
        if (startIndex === -1) {
          startIndex = times.findIndex(t => String(t) >= currentHourPrefix);
          if (startIndex === -1) startIndex = 0;
        }
      } else {
         const todayPrefix = `${yyyy}-${mm}-${dd}`;
         const todayIdx = times.findIndex(t => String(t).startsWith(todayPrefix));
         if (todayIdx !== -1) startIndex = todayIdx;
      }

      const nextTimes = times.slice(startIndex, startIndex + 6);
      const keys = Object.keys(seriesData).filter(k => k !== "time");

      const hasValidData = nextTimes.some((_, idx) => {
        const dataIndex = startIndex + idx;
        return keys.some(k => seriesData[k][dataIndex] !== null && seriesData[k][dataIndex] !== undefined);
      });

      if (!hasValidData) {
        return (
          <div className="open-meteo-service-data">
            <div className="open-meteo-service-row" style={{ marginBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.2)", paddingBottom: "12px" }}>
              <strong>{title} for {cityName}</strong>
            </div>
            <p style={{ color: "rgba(255,255,255,0.8)", padding: "4px 0" }}>No data available for this specific location. (Marine forecasts only return data for oceans and coastal areas).</p>
          </div>
        );
      }

      return (
        <div className="open-meteo-service-data">
          <div className="open-meteo-service-row" style={{ marginBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.2)", paddingBottom: "12px" }}>
            <strong>{title} for {cityName}</strong>
          </div>
          {nextTimes.map((time, idx) => {
            const dataIndex = startIndex + idx;
            const timeStr = isHourly 
              ? new Date(time).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
              : String(time);

            return (
            <div key={time} className="open-meteo-service-row" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', padding: '12px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', marginBottom: '8px', rowGap: '12px', columnGap: '24px' }}>
              <div style={{ flex: '0 0 80px', color: 'white', fontWeight: 'bold' }}>
                  <span>{timeStr}</span>
                </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', rowGap: '8px', columnGap: '12px', flex: 1, minWidth: '150px' }}>
                  {keys.map(k => {
                    const val = seriesData[k][dataIndex];
                    const label = k.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
                    let displayVal = val !== null && val !== undefined ? String(val) : "--";
                    if (typeof val === 'number' && !Number.isInteger(val)) displayVal = val.toFixed(2);
                    
                    return (
                      <div key={k} style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75em", textTransform: 'uppercase', letterSpacing: '0.5px', wordBreak: 'break-word' }}>{label}</span>
                        <strong style={{ color: "white", fontSize: "1em", wordBreak: 'break-word' }}>{displayVal}{units[k] ? ` ${units[k]}` : ""}</strong>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
  }
  return renderOpenMeteoData(data);
}

function getCurrentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation unavailable"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 1000 * 60 * 10
    });
  });
}

export default function App() {
  const [weather, setWeather] = useState<WeatherSnapshot>(fallbackWeather);
  const [status, setStatus] = useState("Loading location...");
  const [appError, setAppError] = useState<string | null>(null);
const PANEL_WIDTH = 380;
  const BASE_WIDTH = 320;
  // TOTAL_WIDTH = BASE_WIDTH + PANEL_WIDTH; // DISABLED - no extra window resize

  useEffect(() => {
    console.log("App starting", { weather, status });
  }, []);

  if (appError) {
    return (
      <main
        style={{
          width: "100%",
          height: "100%",
          background: "#11263d",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }}
      >
        <div>
          <h1>App initialization error</h1>
          <pre style={{ whiteSpace: "pre-wrap" }}>{appError}</pre>
        </div>
      </main>
    );
  }

  const [widgetSize, setWidgetSize] = useState({ width: BASE_WIDGET_WIDTH, height: BASE_WIDGET_HEIGHT });
  const [isExpanded, setIsExpanded] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<number | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [manualQuery, setManualQuery] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [panelMessage, setPanelMessage] = useState<string | null>(null);
  const [selectedOpenMeteoService, setSelectedOpenMeteoService] = useState<string | null>(null);
  const [openMeteoServiceData, setOpenMeteoServiceData] = useState<unknown>(null);
  const [openMeteoServiceError, setOpenMeteoServiceError] = useState<string | null>(null);
  const [openMeteoServiceLoading, setOpenMeteoServiceLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const OPEN_METEO_SERVICES = [
    { id: "seasonal-forecast", label: "Seasonal Forecast" },
    { id: "climate-change", label: "Climate Change" },
    { id: "marine-forecast", label: "Marine Forecast" },
    { id: "air-quality", label: "Air Quality" },
    { id: "satellite-radiation", label: "Satellite Radiation" },
    { id: "geocoding", label: "Geocoding" },
    { id: "elevation", label: "Elevation" },
    { id: "flood", label: "Flood" }
  ];

  const widgetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = widgetRef.current;
    if (!element) {
      return;
    }

    const updateSize = () => {
      const { width, height } = element.getBoundingClientRect();
      setWidgetSize({
        width: Math.max(280, Math.round(width)),
        height: Math.max(250, Math.round(height))
      });
    };

    updateSize();

    const observer = new ResizeObserver(() => {
      updateSize();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  const expandPanel = () => {
    setIsExpanded(true);
    setIsScrolled(false);
    setIsScrolling(false);
  };

// Notification panel - expand height only, no move/resize width
    useEffect(() => {
      if (isExpanded) {
        window.resizeTo(320, 600);
      } else {
        window.resizeTo(320, 250);
      }
    }, [isExpanded]);
  useEffect(() => {
    let active = true;

    const loadWeather = async () => {
      if (manualQuery) {
        try {
          const liveWeather = await fetchLiveWeather(manualQuery);
          if (active) {
            setWeather(liveWeather);
            setStatus(`${liveWeather.city}`);
            setPanelMessage(null);
          }
        } catch {
          if (active) {
            setPanelMessage("Could not find that place.");
          }
        }
        return;
      }

      try {
        const position = await getCurrentPosition();
        const liveWeather = await fetchLiveWeatherByCoords(position.coords.latitude, position.coords.longitude);
        if (active) {
          setWeather(liveWeather);
          setStatus(`${liveWeather.city}`);
          setPanelMessage(null);
        }
        return;
      } catch {
        if (active) {
          setStatus("Geolocation failed, trying IP...");
        }
      }

      try {
        const liveWeather = await fetchLiveWeatherByIp();
        if (active) {
          setWeather(liveWeather);
          setStatus(`${liveWeather.city}`);
          setPanelMessage(null);
        }
      } catch (error) {
        if (active) {
          setWeather(zeroWeather);
          setStatus("Location unavailable");
          setPanelMessage("Search a city to load live details.");
          if (error instanceof Error) {
            setAppError(error.message);
          } else {
            setAppError(String(error));
          }
          console.error("loadWeather catch:", error);
        }
      }
    };

    void loadWeather();
    const timer = window.setInterval(() => {
      void loadWeather();
    }, 1000 * 60 * 5);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [manualQuery]);

  const showTempPlaceholder = weather.source === "Fallback";
  const temperatureDisplay = displayTemp(weather.temperatureC, showTempPlaceholder);
  const usesDarkNumber =
  ["clear", "cloudy", "sunset", "snow"].includes(weather.condition) &&
  !weather.isNight;
  const historicalData = weather.historicalData ?? [];

  const layout = useMemo(() => {
    const widthRatio = widgetSize.width / BASE_WIDGET_WIDTH;
    const heightRatio = widgetSize.height / BASE_WIDGET_HEIGHT;
    const sceneScale = Math.min(widthRatio, heightRatio, 1);
    const numberFontSize = Math.round(Math.min(widgetSize.width * 0.28, widgetSize.height * 0.37));
    const numberWidth = Math.round(numberFontSize * 1.42);
    const numberHeight = Math.round(numberFontSize * 1.28);
    const numberTop = Math.round(widgetSize.height * 0.34);
    const labelTop = numberTop + numberHeight - Math.max(24, Math.round(widgetSize.height * 0.06));
    const statusTop = labelTop + Math.max(20, Math.round(widgetSize.height * 0.055));
    const labelFontSize = Math.max(14, Math.round(numberFontSize * 0.16));
    const statusFontSize = Math.max(11, Math.round(numberFontSize * 0.1));

    return {
      sceneScale,
      numberFontSize,
      numberWidth,
      numberHeight,
      numberTop,
      labelTop,
      statusTop,
      labelFontSize,
      statusFontSize,
      depthBack: Math.max(5, Math.round(numberFontSize * 0.05)),
      depthSide: Math.max(3, Math.round(numberFontSize * 0.032)),
      strokeWidth: Math.max(0.4, numberFontSize * 0.004)
    };
  }, [widgetSize.height, widgetSize.width]);

  const sceneFrameStyle = {
    width: `${BASE_WIDGET_WIDTH}px`,
    height: `${BASE_WIDGET_HEIGHT}px`,
    transform: `translateX(-50%) scale(${layout.sceneScale})`
  } as CSSProperties;

  const numberWrapStyle = {
    top: `${layout.numberTop}px`,
    width: `${layout.numberWidth}px`,
    height: `${layout.numberHeight}px`
  } as CSSProperties;

  const numberTextStyle = {
    fontSize: `${layout.numberFontSize}px`,
    WebkitTextStroke: usesDarkNumber
      ? `${layout.strokeWidth}px rgba(5, 5, 5, 0.26)`
      : `${layout.strokeWidth}px rgba(255, 255, 255, 0.7)`
  } as CSSProperties;

  const numberBackStyle = {
    transform: `translate(${layout.depthBack}px, ${layout.depthBack}px) scaleY(1.18)`,
    color: "rgba(0, 0, 0, 0.12)"
  } as CSSProperties;

  const numberSideStyle = {
    transform: `translate(${layout.depthSide}px, ${layout.depthSide}px) scaleY(1.18)`,
    color: "rgba(0, 0, 0, 0.35)",
    textShadow: `0 4px 12px rgba(0,0,0,0.2)`
  } as CSSProperties;

 const numberFrontStyle = {
  ...numberTextStyle,
  color: usesDarkNumber ? "#111827" : "#ffffff",
  textShadow: usesDarkNumber
    ? `
      0 1px 0 rgba(255,255,255,0.25),
      0 6px 18px rgba(0,0,0,0.18),
      0 12px 30px rgba(0,0,0,0.12)
    `
    : `
      0 1px 0 rgba(255,255,255,0.6),
      0 4px 10px rgba(0,0,0,0.12),
      0 10px 25px rgba(0,0,0,0.18)
    `,
  filter: `
    drop-shadow(0 6px 18px rgba(0,0,0,0.15))
    drop-shadow(0 2px 6px rgba(255,255,255,0.08))
  `,
} as CSSProperties;

  const labelStyle = {
    top: `${layout.labelTop}px`,
    left: "50%",
    transform: "translateX(-50%)",
    textAlign: "center",
    fontSize: `${layout.labelFontSize}px`,
    color: "rgba(245, 248, 255, 0.94)",
    textShadow: "0 2px 12px rgba(10, 18, 32, 0.32)"
  } as CSSProperties;

  const statusStyle = {
    top: `${layout.statusTop}px`,
    left: "50%",
    transform: "translateX(-50%)",
    textAlign: "center",
    fontSize: `${layout.statusFontSize}px`,
    color: "rgba(238, 242, 248, 0.78)",
    textShadow: "0 1px 10px rgba(10, 18, 32, 0.18)"
  } as CSSProperties;

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchValue.trim();
    if (!query) {
      return;
    }

    setIsSearching(true);
    setPanelMessage(null);
    setShowSuggestions(false);

    try {
      const liveWeather = await fetchLiveWeather(query);
      setWeather({
        ...liveWeather,
        updatedAt: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        })
      });
      setStatus(`${liveWeather.city}`);
      setManualQuery(query);
      setSearchValue("");
      setSuggestions([]);
    } catch {
      setPanelMessage("Could not find that location.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleServiceButtonClick = (serviceId: string) => {
    if (selectedOpenMeteoService === serviceId) {
      setSelectedOpenMeteoService(null);
      setOpenMeteoServiceData(null);
      setOpenMeteoServiceError(null);
    } else {
      void loadOpenMeteoService(serviceId);
    }
  };


  const loadOpenMeteoService = async (serviceId: string) => {
    if (!weather.latitude || !weather.longitude) {
      setOpenMeteoServiceError("Location latitude/longitude not available yet.");
      return;
    }

    setSelectedOpenMeteoService(serviceId);
    setOpenMeteoServiceLoading(true);
    setOpenMeteoServiceError(null);
    setOpenMeteoServiceData(null);

    try {
      const result = await fetchOpenMeteoService(serviceId, weather.latitude, weather.longitude, weather.timezone);
      setOpenMeteoServiceData(result);
    } catch (error) {
      setOpenMeteoServiceError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setOpenMeteoServiceLoading(false);
    }
  };

const debounce = (fn: Function, delay: number) => {
    let timer: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  const debouncedFetchSuggestions = useCallback(debounce(async (value: string) => {
    if (value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const results = await fetchLocationSuggestions(value);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, 300), []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    setPanelMessage(null);
    debouncedFetchSuggestions(value);
  };

  const handleSelectSuggestion = async (suggestion: LocationSuggestion) => {
    const query = `${suggestion.name}, ${suggestion.country}`;
    setSearchValue(query);
    setSuggestions([]);
    setShowSuggestions(false);
    setIsSearching(true);
    try {
      const liveWeather = await fetchLiveWeather(query);
      setWeather({
        ...liveWeather,
        updatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      });
      setStatus(liveWeather.city);
      setManualQuery(query);
      setPanelMessage(null);
    } catch (error) {
      console.error("Suggestion fetch error:", error);
      setPanelMessage("Could not fetch weather for selected location.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleUseCurrentLocation = () => {
    setManualQuery(null);
    setPanelMessage(null);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const displayHourlyDetails = useMemo(() => {
    if (!weather.hourlyDetails) {
      return [];
    }

        const currentHour = new Date().getHours();
        let startIndex = 0;
        let prevHour = -1;

    // The API provides data for the whole day. Find the index of the current or next hour
        // to start the forecast from the present time by parsing the label.
        for (let i = 0; i < weather.hourlyDetails.length; i++) {
          const label = weather.hourlyDetails[i].label?.toLowerCase().trim() || "";
          if (label === "now") {
            startIndex = i;
            break;
          }

          let hour = -1;
          const ampmMatch = label.match(/^(\d{1,2})\s*(am|pm)$/);
          if (ampmMatch) {
            hour = parseInt(ampmMatch[1], 10);
            const isPm = ampmMatch[2] === "pm";
            if (hour === 12) hour = isPm ? 12 : 0;
            else if (isPm) hour += 12;
          } else {
            const timeMatch = label.match(/^(\d{1,2}):\d{2}$/);
            if (timeMatch) hour = parseInt(timeMatch[1], 10);
            else {
              const hourMatch = label.match(/^(\d{1,2})$/);
              if (hourMatch) hour = parseInt(hourMatch[1], 10);
            }
          }

          if (hour !== -1) {
            if (hour >= currentHour || (prevHour !== -1 && hour < prevHour)) {
              startIndex = i;
              break;
            }
            prevHour = hour;
          }
        }

        const relevantDetails = weather.hourlyDetails.slice(startIndex);
    return relevantDetails.filter(item => item.label?.toLowerCase().trim() !== "now");
  }, [weather.hourlyDetails]);

  const handlePanelScroll = (e: React.UIEvent<HTMLElement>) => {
    setIsScrolled(e.currentTarget.scrollTop > 0);
    setIsScrolling(true);

    if (scrollTimeoutRef.current !== null) {
      window.clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = window.setTimeout(() => {
      setIsScrolling(false);
    }, 2000);
  };

  return (
    <>
      <style>
        {`
          .detail-panel::-webkit-scrollbar,
          .detail-overlay::-webkit-scrollbar {
            width: 6px;
          }
          .detail-panel::-webkit-scrollbar-track,
          .detail-overlay::-webkit-scrollbar-track {
            background: transparent;
          }
          .detail-panel::-webkit-scrollbar-thumb,
          .detail-overlay::-webkit-scrollbar-thumb {
            background-color: transparent;
            border-radius: 10px;
          }
          .detail-panel.is-scrolling::-webkit-scrollbar-thumb,
          .detail-overlay.is-scrolling::-webkit-scrollbar-thumb {
            background-color: rgba(255, 255, 255, 0.4);
          }
        `}
      </style>
    <main
        className={`poster-shell condition-${weather.condition}`}
        style={{
          position: "relative",
          width: "320px",  // Fixed widget width - notification style overlay
          height: isExpanded ? "600px" : "250px",
          overflow: "hidden"
        }}
      >
      <section className="poster-widget" ref={widgetRef}>
        <div className="poster-frame poster-scene-frame" style={sceneFrameStyle}>
          <div className="poster-scene">
            <WeatherScene condition={weather.condition} temperature={weather.temperatureC} isNight={Boolean(weather.isNight)} />
          </div>
        </div>

        <div className="poster-hero">
          <button
            type="button"
            className={`poster-number-wrap poster-number-button${showTempPlaceholder ? " is-placeholder" : ""}`}
            style={numberWrapStyle}
            aria-label={showTempPlaceholder ? "Temperature unavailable" : `${Math.round(weather.temperatureC)} degrees`}
            onClick={expandPanel}
          >
            <span className="poster-number-back" style={{ ...numberTextStyle, ...numberBackStyle }}>
              {temperatureDisplay}
            </span>
            <span className="poster-number-side" style={{ ...numberTextStyle, ...numberSideStyle }}>
              {temperatureDisplay}
            </span>
            <span className="poster-number-front" style={numberFrontStyle}>
              {temperatureDisplay}
            </span>
          </button>

          <div className="poster-label" style={labelStyle}>
            {displayConditionName(weather.condition, Boolean(weather.isNight))}
          </div>

          <div className="poster-status" style={statusStyle}>
            {status}
          </div>
        </div>
      </section>

        {isExpanded ? (
          <div
            className={`detail-overlay ${isScrolling ? "is-scrolling" : ""}`}
            onClick={() => setIsExpanded(false)}
            onScroll={handlePanelScroll}
          >
<section 
  className={`detail-panel ${isScrolling ? "is-scrolling" : ""}`}
  onClick={(event) => event.stopPropagation()}
  onScroll={handlePanelScroll}
  style={{
    width: '100%',
    boxSizing: 'border-box' as CSSProperties['boxSizing'],
    wordBreak: 'break-word' as CSSProperties['wordBreak'],
    padding: 0 // Remove panel padding so header hits the edges naturally
  }}
>
              <section 
                className="live-weather-header-section"
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 10,
                  backdropFilter: isScrolled ? "blur(12px)" : "none",
                  WebkitBackdropFilter: isScrolled ? "blur(12px)" : "none",
                  transition: "backdrop-filter 0.2s ease, -webkit-backdrop-filter 0.2s ease",
                  padding: "24px 24px 12px 24px",
                  borderTopLeftRadius: 'inherit', // Smoothly match the parent's rounded corners
                  borderTopRightRadius: 'inherit',
                  width: "100%",
                  boxSizing: "border-box"
                }}
              >
                <p className="detail-kicker" style={{ margin: 0 }}>Live Weather Forecast</p>
              </section>
              <div className="detail-panel-content" style={{ padding: "0 24px 24px 24px" }}>
              <header className="detail-topbar">
                <div>
                  <h2 className="detail-place">{weather.city}</h2>
                  <p className="detail-region">
                    {weather.region || weather.summary}
                    {weather.timezone ? ` • ${weather.timezone}` : ""}
                  </p>
                </div>
                <button type="button" className="detail-close" onClick={() => setIsExpanded(false)}>
                  Back
                </button>
              </header>

              <section className="detail-stage" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', boxSizing: 'border-box', padding: '0 12px' }}>
                <div className="detail-glow detail-glow-left" />
                <div className="detail-glow detail-glow-right" />
                <div className="detail-hero-core" style={{ textAlign: 'center', fontSize: '0.95em' }}>
                  <div className="detail-temp-display" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'baseline', gap: '0 12px' }}>
                    <span className="detail-temp-c">{formatTemp(weather.temperatureC, showTempPlaceholder)}<span className="temp-unit">C</span></span>
                    <span className="detail-temp-f">{showTempPlaceholder ? "--" : `${toFahrenheit(weather.temperatureC)}°`}<span className="temp-unit">F</span></span>
                  </div>
                  <div className="detail-tone-pill">{displayConditionName(weather.condition, Boolean(weather.isNight))}</div>
                  <p className="detail-summary-text">{weather.summary}</p>
                </div>

                <div className="detail-orbit-strip detail-orbit-strip-top" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-around', alignItems: 'center', width: '100%', gap: '8px', marginTop: '12px' }}>
                  <div className="orbit-metric">
                    <span className="orbit-label">Feels</span>
                    <strong>{formatTemp(weather.feelsLikeC, showTempPlaceholder)}</strong>
                  </div>
                  <div className="orbit-metric">
                    <span className="orbit-label">Wind</span>
                    <strong>{Math.round(weather.windKph)} km/h</strong>
                  </div>
                  <div className="orbit-metric">
                    <span className="orbit-label">Humidity</span>
                    <strong>{Math.round(weather.humidity)}%</strong>
                  </div>
                </div>

                <div className="detail-orbit-strip detail-orbit-strip-bottom" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-around', alignItems: 'center', width: '100%', gap: '8px' }}>
                  <div className="orbit-metric orbit-metric-wide">
                    <span className="orbit-label">UV</span>
                    <strong>{weather.uvIndex.toFixed(1)}</strong>
                    <em>{getUvLabel(weather.uvIndex)}</em>
                  </div>
                  <div className="orbit-metric orbit-metric-wide">
                    <span className="orbit-label">Updated</span>
                    <strong>
                    {new Date().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </strong>
                    <em>{status}</em>
                  </div>
                </div>
              </section>

              <section className="detail-ribbon-zone">
                <div className="detail-section-head">
                  <span>Next Hours</span>
                  <span>{displayConditionName(weather.condition, Boolean(weather.isNight))}</span>
                </div>
                <div className="detail-ribbon-scroll">
                  {displayHourlyDetails
                    .map((item) => (
                  <article key={item.label} className="forecast-pill" style={{ flex: '0 0 auto' }}>

                        <span className="forecast-time">{item.label}</span>
                        <span className="forecast-meta">Wind</span>

                        <strong className="forecast-temp">
                          {formatTemp(item.temperatureC)}
                        </strong>
                        <span className="forecast-meta">
                          {Math.round(item.windKph)} km/h
                        </span>

                        <span className="forecast-state">
                          {displayConditionName(item.condition)}
                        </span>
                        <span className="forecast-meta">
                          UV {item.uvIndex.toFixed(1)}
                        </span>

                      </article>
                    ))}
                </div>
              </section>

              {weather.specificLocation && (
                <section className="detail-location-info">
                  <div className="detail-section-head">
                    <span>Specific Location</span>
                  </div>
                  <div className="location-detail">
                    <p className="location-text">{weather.specificLocation}</p>
                  </div>
                </section>
              )}

              <section className="detail-astronomy-zone">
                <div className="detail-section-head">
                  <span>Astronomy</span>
                </div>
                <div className="astronomy-grid">
                  <div className="astronomy-card">
                    <span className="astronomy-label">🌅 Sunrise</span>
                    <span className="astronomy-value">{weather.sunrise ?? "--"}</span>
                  </div>
                  <div className="astronomy-card">
                    <span className="astronomy-label">🌇 Sunset</span>
                    <span className="astronomy-value">{weather.sunset ?? "--"}</span>
                  </div>
                  <div className="astronomy-card">
                    <span className="astronomy-label">🌙 Moonrise</span>
                    <span className="astronomy-value">{weather.moonrise ?? "--"}</span>
                  </div>
                  <div className="astronomy-card">
                    <span className="astronomy-label">🌙 Moonset</span>
                    <span className="astronomy-value">{weather.moonset ?? "--"}</span>
                  </div>
                </div>
              </section>

              {historicalData.length > 0 && (
                <section className="detail-historical-zone">
                  <div className="detail-section-head">
                    <span>Last 10 Days</span>
                  </div>
                  <div className="historical-grid">
                    {historicalData.map((item) => (
                      <article key={item.date} className="historical-card">
                        <span className="historical-date">
                          {new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        <div className="historical-temps">
                          <span className="temp-max">{Math.round(item.temperatureMaxC)}°</span>
                          <span className="temp-min">{Math.round(item.temperatureMinC)}°</span>
                        </div>
                        <span className="historical-condition">{displayConditionName(item.condition)}</span>
                        {item.precipitationMm > 0 && (
                          <span className="historical-precip">↓ {item.precipitationMm.toFixed(1)}mm</span>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              )}

              <section className="detail-open-meteo-tools">
<div className="detail-section-head">
                  <span>Fetch more live data for this location</span>
                </div>
                <div className="open-meteo-service-list">
                  {OPEN_METEO_SERVICES.map((service) => (
                    <React.Fragment key={service.id}>
                      <button
                        type="button"
                        className={`open-meteo-service-button${service.id === selectedOpenMeteoService ? " active" : ""}`}
                        onClick={() => handleServiceButtonClick(service.id)}
                      >
                        {service.label}
                      </button>
                      {selectedOpenMeteoService === service.id && (
                        <div className="open-meteo-service-output" style={{ gridColumn: '1 / -1' }}>
                          {openMeteoServiceLoading ? (
                            <p>Loading {service.label}…</p>
                          ) : openMeteoServiceError ? (
                            <p className="error">{openMeteoServiceError}</p>
                          ) : openMeteoServiceData ? (
                            service.id === "air-quality"
                              ? renderAirQualityData(openMeteoServiceData, weather.city)
                              : service.id === "seasonal-forecast"
                              ? renderSeasonalData(openMeteoServiceData, weather.city)
                              : service.id === "marine-forecast"
                              ? renderTimeSeriesData(openMeteoServiceData, weather.city, "Marine Forecast", weather.timezone)
                              : service.id === "satellite-radiation"
                              ? renderTimeSeriesData(openMeteoServiceData, weather.city, "Satellite Radiation", weather.timezone)
                              : service.id === "flood"
                              ? renderTimeSeriesData(openMeteoServiceData, weather.city, "Flood Risk", weather.timezone)
                              : service.id === "climate-change"
                              ? renderTimeSeriesData(openMeteoServiceData, weather.city, "Climate Change", weather.timezone)
                              : service.id === "elevation"
                              ? renderElevationData(openMeteoServiceData, weather.city)
                              : service.id === "geocoding"
                              ? renderGeocodingData(openMeteoServiceData, weather.city)
                              : renderOpenMeteoData(openMeteoServiceData)
                          ) : null}
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </section>

              <section className="detail-search-dock">
                <form className="search-glass" onSubmit={handleSearch}>
                  <input
                    className="search-glass-input"
                    type="text"
                    placeholder="Search a location"
                    value={searchValue}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    autoComplete="off"
                  />
                  <button className="search-glass-button" type="submit" disabled={isSearching}>
                    {isSearching ? "Finding" : "Search"}
                  </button>
                  {showSuggestions && (
                    <ul className="suggestions-dropdown" role="listbox">
                      {suggestions.map((suggestion, index) => (
                        <li
                          key={`${suggestion.latitude}-${suggestion.longitude}`}
                          className="suggestion-item"
                          onMouseDown={() => handleSelectSuggestion(suggestion)}
                          role="option"
                          aria-selected={false}
                        >
                          {suggestion.name}, {suggestion.region || suggestion.country}
                        </li>
                      ))}
                    </ul>
                  )}
                </form>
                <button type="button" className="search-current" onClick={handleUseCurrentLocation}>
                  Current location
                </button>
                {panelMessage ? <p className="panel-message">{panelMessage}</p> : null}
              </section>
            </div>
            </section>
          </div>
        ) : null}
    </main>
    </>
  );
}
