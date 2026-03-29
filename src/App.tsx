import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { WeatherScene } from "./components/WeatherScene";
import { fallbackWeather } from "./data/mockWeather";
import { fetchLiveWeather, fetchLiveWeatherByCoords, fetchLiveWeatherByIp } from "./lib/liveWeather";
import type { WeatherSnapshot } from "./types";

const BASE_WIDGET_WIDTH = 560;
const BASE_WIDGET_HEIGHT = 420;
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

function displayConditionName(value: WeatherSnapshot["condition"]) {
  switch (value) {
    case "clear":
      return "Sunny";
    case "cloudy":
      return "Cloud Cover";
    case "rain":
      return "Rain Flow";
    case "storm":
      return "Storm Pulse";
    case "snow":
      return "Snow Drift";
    case "sunset":
      return "Night Sky";
    default:
      return titleCase(value);
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
  const [widgetSize, setWidgetSize] = useState({ width: BASE_WIDGET_WIDTH, height: BASE_WIDGET_HEIGHT });
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [manualQuery, setManualQuery] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [panelMessage, setPanelMessage] = useState<string | null>(null);
  const widgetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = widgetRef.current;
    if (!element) {
      return;
    }

    const updateSize = () => {
      const { width, height } = element.getBoundingClientRect();
      setWidgetSize({
        width: Math.max(320, Math.round(width)),
        height: Math.max(280, Math.round(height))
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

  useEffect(() => {
    let active = true;

    const loadWeather = async () => {
      if (manualQuery) {
        try {
          const liveWeather = await fetchLiveWeather(manualQuery);
          if (active) {
            setWeather(liveWeather);
            setStatus(`Location: ${liveWeather.city}`);
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
          setStatus(`Location: ${liveWeather.city}`);
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
          setStatus(`Location: ${liveWeather.city}`);
          setPanelMessage(null);
        }
      } catch {
        if (active) {
          setWeather(zeroWeather);
          setStatus("Location unavailable");
          setPanelMessage("Search a city to load live details.");
        }
      }
    };

    void loadWeather();
    const timer = window.setInterval(() => {
      void loadWeather();
    }, 1000 * 60 * 10);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [manualQuery]);

  const showTempPlaceholder = weather.source === "Fallback";
  const temperatureDisplay = displayTemp(weather.temperatureC, showTempPlaceholder);
  const usesDarkNumber = ["clear", "cloudy", "sunset", "snow"].includes(weather.condition);

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
    color: usesDarkNumber ? "rgba(67, 26, 32, 0.2)" : "rgba(178, 62, 70, 0.18)"
  } as CSSProperties;

  const numberSideStyle = {
    transform: `translate(${layout.depthSide}px, ${layout.depthSide}px) scaleY(1.18)`,
    color: usesDarkNumber ? "rgba(90, 36, 42, 0.78)" : "rgba(178, 62, 70, 0.9)",
    textShadow: usesDarkNumber
      ? `0 ${Math.max(3, Math.round(layout.numberFontSize * 0.026))}px ${Math.max(6, Math.round(layout.numberFontSize * 0.052))}px rgba(70, 28, 34, 0.16)`
      : `0 ${Math.max(3, Math.round(layout.numberFontSize * 0.026))}px ${Math.max(6, Math.round(layout.numberFontSize * 0.052))}px rgba(178, 62, 70, 0.14)`
  } as CSSProperties;

 const numberFrontStyle = {
  ...numberTextStyle,
  color: usesDarkNumber ? "#1f2937" : "#ffffff",
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
    fontSize: `${layout.labelFontSize}px`,
    color: "rgba(245, 248, 255, 0.94)",
    textShadow: "0 2px 12px rgba(10, 18, 32, 0.32)"
  } as CSSProperties;

  const statusStyle = {
    top: `${layout.statusTop}px`,
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

    try {
      const liveWeather = await fetchLiveWeather(query);
      setWeather(liveWeather);
      setStatus(`Location: ${liveWeather.city}`);
      setManualQuery(query);
      setSearchValue("");
    } catch {
      setPanelMessage("Could not find that location.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleUseCurrentLocation = () => {
    setManualQuery(null);
    setPanelMessage(null);
  };

  return (
    <main className={`poster-shell condition-${weather.condition}`}>
      <section className="poster-widget" ref={widgetRef}>
        <div className="poster-frame poster-scene-frame" style={sceneFrameStyle}>
          <div className="poster-scene">
            <WeatherScene condition={weather.condition} temperature={weather.temperatureC} />
          </div>
        </div>

        <div className="poster-hero">
          <button
            type="button"
            className={`poster-number-wrap poster-number-button${showTempPlaceholder ? " is-placeholder" : ""}`}
            style={numberWrapStyle}
            aria-label={showTempPlaceholder ? "Temperature unavailable" : `${Math.round(weather.temperatureC)} degrees`}
            onClick={() => setIsExpanded(true)}
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
            {titleCase(weather.condition)}
          </div>

          <div className="poster-status" style={statusStyle}>
            {status}
          </div>
        </div>

        {isExpanded ? (
          <div className="detail-overlay" onClick={() => setIsExpanded(false)}>
            <section className="detail-panel" onClick={(event) => event.stopPropagation()}>
              <header className="detail-topbar">
                <div>
                  <p className="detail-kicker">Live Atmosphere</p>
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

              <section className="detail-stage">
                <div className="detail-glow detail-glow-left" />
                <div className="detail-glow detail-glow-right" />
                <div className="detail-hero-core">
                  <div className="detail-temp-display">
                    <span className="detail-temp-c">{formatTemp(weather.temperatureC, showTempPlaceholder)}C</span>
                    <span className="detail-temp-separator">&nbsp;&nbsp;</span>
                    <span className="detail-temp-f">{showTempPlaceholder ? "--" : `${toFahrenheit(weather.temperatureC)}°`}F</span>
                  </div>
                  <div className="detail-tone-pill">{displayConditionName(weather.condition)}</div>
                  <p className="detail-summary-text">{weather.summary}</p>
                </div>

                <div className="detail-orbit-strip detail-orbit-strip-top">
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

                <div className="detail-orbit-strip detail-orbit-strip-bottom">
                  <div className="orbit-metric orbit-metric-wide">
                    <span className="orbit-label">UV</span>
                    <strong>{weather.uvIndex.toFixed(1)}</strong>
                    <em>{getUvLabel(weather.uvIndex)}</em>
                  </div>
                  <div className="orbit-metric orbit-metric-wide">
                    <span className="orbit-label">Updated</span>
                    <strong>{weather.updatedAt}</strong>
                    <em>{status}</em>
                  </div>
                </div>
              </section>

              <section className="detail-ribbon-zone">
                <div className="detail-section-head">
                  <span>Next Hours</span>
                  <span>{displayConditionName(weather.condition)}</span>
                </div>
                <div className="detail-ribbon-scroll">
                  {weather.hourlyDetails.map((item) => (
                    <article key={item.label} className="forecast-pill">
                      <span className="forecast-time">{item.label}</span>
                      <strong className="forecast-temp">{formatTemp(item.temperatureC)}</strong>
                      <span className="forecast-state">{displayConditionName(item.condition)}</span>
                      <span className="forecast-meta">Wind {Math.round(item.windKph)} km/h</span>
                      <span className="forecast-meta">UV {item.uvIndex.toFixed(1)}</span>
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

              <section className="detail-debug">
                <p><strong>DEBUG astronomy raw:</strong></p>
                <p>sunrise: {String(weather.sunrise)}</p>
                <p>sunset: {String(weather.sunset)}</p>
                <p>moonrise: {String(weather.moonrise)}</p>
                <p>moonset: {String(weather.moonset)}</p>
              </section>

              {weather.historicalData && weather.historicalData.length > 0 && (
                <section className="detail-historical-zone">
                  <div className="detail-section-head">
                    <span>Last 10 Days</span>
                  </div>
                  <div className="historical-grid">
                    {weather.historicalData.map((item) => (
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

              <section className="detail-search-dock">
                <form className="search-glass" onSubmit={handleSearch}>
                  <input
                    className="search-glass-input"
                    type="text"
                    placeholder="Search a new city"
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                  />
                  <button className="search-glass-button" type="submit" disabled={isSearching}>
                    {isSearching ? "Finding" : "Search"}
                  </button>
                </form>
                <button type="button" className="search-current" onClick={handleUseCurrentLocation}>
                  Current location
                </button>
                {panelMessage ? <p className="panel-message">{panelMessage}</p> : null}
              </section>
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}
